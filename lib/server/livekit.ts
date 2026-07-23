import "server-only";
import { AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import {
  dispatchAndWaitForAgent,
  normalizeLiveKitUrl,
  safeDeleteRoom,
  type LiveKitDispatchClients,
} from "@/lib/livekit/dispatch-core";
import type { RuntimeConfig } from "@/lib/server/runtime-config";

export const assessmentAgentName = "quisqueyatech-assessment";
export const defaultLiveKitSubdomain = "live-translate-r87y5gh3";

export function expectedLiveKitHostname() {
  const configured = process.env.LIVEKIT_PROJECT_SUBDOMAIN?.trim() || defaultLiveKitSubdomain;
  return configured.includes(".")
    ? configured.toLowerCase()
    : `${configured.toLowerCase()}.livekit.cloud`;
}

export function createLiveKitClients(config: RuntimeConfig) {
  const { apiUrl, hostname } = normalizeLiveKitUrl(
    String(config.livekitUrl || ""),
    expectedLiveKitHostname(),
  );
  const apiKey = String(config.livekitApiKey || "");
  const apiSecret = String(config.livekitApiSecret || "");
  if (!apiKey || !apiSecret) throw new Error("LiveKit credentials are required");
  return {
    hostname,
    clients: {
      dispatch: new AgentDispatchClient(apiUrl, apiKey, apiSecret),
      rooms: new RoomServiceClient(apiUrl, apiKey, apiSecret),
    } satisfies LiveKitDispatchClients,
  };
}

export async function dispatchAssessmentAgent({
  config,
  roomName,
  metadata,
  supportId,
  agentReady,
}: {
  config: RuntimeConfig;
  roomName: string;
  metadata: string;
  supportId: string;
  agentReady?: (participant: { metadata?: string }) => boolean;
}) {
  const { hostname, clients } = createLiveKitClients(config);
  const result = await dispatchAndWaitForAgent({
    clients,
    roomName,
    agentName: assessmentAgentName,
    metadata,
    supportId,
    timeoutMs: Number(process.env.LIVEKIT_AGENT_READY_TIMEOUT_MS || 60_000),
    agentReady:
      agentReady ||
      ((participant) => {
        try {
          const metadata = JSON.parse(participant.metadata || "{}");
          return metadata.ready === true || metadata.state === "ready";
        } catch {
          return false;
        }
      }),
    agentFailure: (participant) => {
      try {
        const state = JSON.parse(participant.metadata || "{}").state;
        if (state === "configuration_error") return "AGENT_CONFIGURATION";
        if (state === "model_unavailable") return "AGENT_MODEL_UNAVAILABLE";
      } catch {
        // Metadata is best-effort until the agent publishes its readiness contract.
      }
      return undefined;
    },
  });
  console.info(
    JSON.stringify({
      service: "assessment-start",
      stage: "agent_ready",
      supportId,
      roomName,
      latencyMs: result.latencyMs,
    }),
  );
  return { ...result, hostname, clients };
}

export async function probeLiveKitAgent(config: RuntimeConfig, supportId: string) {
  const roomName = `diagnostic-${supportId}`;
  const metadata = JSON.stringify({ diagnostic: true, verifyApplication: true, supportId });
  const result = await dispatchAssessmentAgent({
    config,
    roomName,
    metadata,
    supportId,
    agentReady: (participant) => {
      try {
        return Boolean(JSON.parse(participant.metadata || "{}").diagnosticComplete);
      } catch {
        return false;
      }
    },
  });
  await safeDeleteRoom(result.clients, roomName);
  let diagnostic: { diagnosticComplete?: boolean; success?: boolean; code?: string } = {};
  try {
    diagnostic = JSON.parse(result.agent.metadata || "{}");
  } catch {
    diagnostic = {};
  }
  if (!diagnostic.diagnosticComplete || !diagnostic.success)
    throw new Error(`LiveKit application diagnostic failed (${diagnostic.code || "UNKNOWN"})`);
  return {
    success: true,
    projectHost: result.hostname,
    agentName: assessmentAgentName,
    dispatchReady: true,
    latencyMs: result.latencyMs,
  };
}

export async function cleanupAssessmentRoom(config: RuntimeConfig, roomName: string) {
  const { clients } = createLiveKitClients(config);
  await safeDeleteRoom(clients, roomName);
}
