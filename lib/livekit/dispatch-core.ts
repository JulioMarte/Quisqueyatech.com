export type LiveKitParticipant = { identity: string; kind: number; metadata?: string };
export type LiveKitDispatch = { id: string; agentName: string; room: string };
export const liveKitAgentKind = 4;

export type LiveKitDispatchClients = {
  dispatch: {
    createDispatch: (
      roomName: string,
      agentName: string,
      options: { metadata: string },
    ) => Promise<LiveKitDispatch>;
  };
  rooms: {
    listParticipants: (roomName: string) => Promise<LiveKitParticipant[]>;
    deleteRoom: (roomName: string) => Promise<void>;
  };
};

export class LiveKitDispatchError extends Error {
  constructor(
    readonly code:
      | "PROJECT_MISMATCH"
      | "AGENT_DISPATCH_FAILED"
      | "AGENT_COLD_START_TIMEOUT"
      | "AGENT_CONFIGURATION"
      | "AGENT_MODEL_UNAVAILABLE",
    readonly supportId: string,
    message: string,
    readonly roomName?: string,
    readonly dispatch?: LiveKitDispatch,
  ) {
    super(message);
    this.name = "LiveKitDispatchError";
  }
}

function dispatchLog(
  stage: string,
  details: Record<string, unknown> = {},
  level: "info" | "error" = "info",
) {
  const line = JSON.stringify({
    service: "livekit-dispatch",
    stage,
    occurredAt: new Date().toISOString(),
    ...details,
  });
  if (level === "error") console.error(line);
  else console.info(line);
}

export function safeJsonObject(raw: string | undefined) {
  try {
    const value = JSON.parse(raw || "{}") as Record<string, unknown>;
    return typeof value === "object" && value ? value : {};
  } catch {
    return {};
  }
}

export function safeAgentMetadata(raw: string | undefined) {
  const value = safeJsonObject(raw);
  if (!Object.keys(value).length && raw) return { state: "metadata_parse_failed" };
  return {
    state: typeof value.state === "string" ? value.state.slice(0, 80) : undefined,
    ready: typeof value.ready === "boolean" ? value.ready : undefined,
    code: typeof value.code === "string" ? value.code.slice(0, 80) : undefined,
    diagnosticComplete:
      typeof value.diagnosticComplete === "boolean" ? value.diagnosticComplete : undefined,
    success: typeof value.success === "boolean" ? value.success : undefined,
  };
}

export function agentMetadataState(raw: string | undefined) {
  const value = safeJsonObject(raw);
  return {
    state: typeof value.state === "string" ? value.state : undefined,
    ready: value.ready === true,
    diagnosticComplete: value.diagnosticComplete === true,
    success: value.success === true,
    code: typeof value.code === "string" ? value.code : undefined,
  };
}

export function normalizeLiveKitUrl(raw: string, expectedHostname: string) {
  const url = new URL(raw);
  if (!["wss:", "https:"].includes(url.protocol))
    throw new Error("LiveKit URL must use WSS or HTTPS");
  const hostname = url.hostname.toLowerCase();
  if (hostname !== expectedHostname.toLowerCase())
    throw new Error(`LiveKit project mismatch: expected ${expectedHostname}, received ${hostname}`);
  url.protocol = "https:";
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return { apiUrl: url.toString(), hostname };
}

export async function dispatchAndWaitForAgent({
  clients,
  roomName,
  agentName,
  metadata,
  supportId,
  timeoutMs = 60_000,
  pollMs = 500,
  agentKind = liveKitAgentKind,
  agentReady = () => true,
  agentFailure,
}: {
  clients: LiveKitDispatchClients;
  roomName: string;
  agentName: string;
  metadata: string;
  supportId: string;
  timeoutMs?: number;
  pollMs?: number;
  agentKind?: number;
  agentReady?: (participant: LiveKitParticipant) => boolean;
  agentFailure?: (
    participant: LiveKitParticipant,
  ) => "AGENT_CONFIGURATION" | "AGENT_MODEL_UNAVAILABLE" | undefined;
}) {
  let dispatch: LiveKitDispatch;
  try {
    dispatchLog("dispatch_create_start", { supportId, roomName, agentName });
    dispatch = await clients.dispatch.createDispatch(roomName, agentName, { metadata });
    dispatchLog("dispatch_create_success", {
      supportId,
      roomName,
      agentName,
      dispatchId: dispatch.id,
    });
  } catch (error) {
    dispatchLog(
      "dispatch_create_failed",
      {
        supportId,
        roomName,
        agentName,
        error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
      },
      "error",
    );
    throw new LiveKitDispatchError(
      "AGENT_DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit dispatch failed",
      roomName,
    );
  }

  const deadline = Date.now() + timeoutMs;
  let lastParticipantSignature = "";
  let lastAgentState: ReturnType<typeof safeAgentMetadata> | undefined;
  try {
    while (Date.now() < deadline) {
      const participants = await clients.rooms.listParticipants(roomName);
      const agents = participants.filter((candidate) => candidate.kind === agentKind);
      const participantSignature = agents
        .map((participant) => {
          const parsed = safeAgentMetadata(participant.metadata);
          return `${participant.identity}:${parsed.state || ""}:${parsed.ready ?? ""}:${parsed.code || ""}:${parsed.diagnosticComplete ?? ""}`;
        })
        .join("|");
      if (participantSignature !== lastParticipantSignature) {
        lastParticipantSignature = participantSignature;
        lastAgentState = agents.length
          ? safeAgentMetadata(agents[agents.length - 1].metadata)
          : lastAgentState;
        dispatchLog("participants_observed", {
          supportId,
          roomName,
          agentName,
          participantCount: participants.length,
          agentCount: agents.length,
          agents: agents.map((participant) => ({
            identity: participant.identity,
            kind: participant.kind,
            metadata: safeAgentMetadata(participant.metadata),
          })),
        });
      }
      for (const participant of participants.filter((candidate) => candidate.kind === agentKind)) {
        const failure = agentFailure?.(participant);
        if (failure)
          throw new LiveKitDispatchError(
            failure,
            supportId,
            `LiveKit agent reported ${failure}`,
            roomName,
            dispatch,
          );
      }
      const agent = participants.find(
        (participant) => participant.kind === agentKind && agentReady(participant),
      );
      if (agent) {
        dispatchLog("agent_ready", {
          supportId,
          roomName,
          agentName,
          identity: agent.identity,
          latencyMs: timeoutMs - Math.max(0, deadline - Date.now()),
          metadata: safeAgentMetadata(agent.metadata),
        });
        return { dispatch, agent, latencyMs: timeoutMs - Math.max(0, deadline - Date.now()) };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(pollMs, Math.max(1, deadline - Date.now()))),
      );
    }
  } catch (error) {
    if (error instanceof LiveKitDispatchError) {
      dispatchLog("cleanup_after_terminal_agent_error", {
        supportId,
        roomName,
        agentName,
        code: error.code,
      });
      await safeDeleteRoom(clients, roomName);
      throw error;
    }
    dispatchLog(
      "participant_check_failed",
      {
        supportId,
        roomName,
        agentName,
        error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
      },
      "error",
    );
    await safeDeleteRoom(clients, roomName);
    throw new LiveKitDispatchError(
      "AGENT_DISPATCH_FAILED",
      supportId,
      error instanceof Error ? error.message : "LiveKit participant check failed",
      roomName,
      dispatch,
    );
  }
  dispatchLog(
    "agent_cold_start_timeout",
    { supportId, roomName, agentName, timeoutMs, lastAgentState },
    "error",
  );
  throw new LiveKitDispatchError(
    "AGENT_COLD_START_TIMEOUT",
    supportId,
    "LiveKit agent did not become ready before the cold-start deadline",
    roomName,
    dispatch,
  );
}

export async function safeDeleteRoom(clients: LiveKitDispatchClients, roomName: string) {
  try {
    dispatchLog("room_cleanup_start", { roomName });
    await clients.rooms.deleteRoom(roomName);
    dispatchLog("room_cleanup_success", { roomName });
  } catch {
    // The room may already be gone; cleanup must not hide the primary result.
    dispatchLog("room_cleanup_skipped", { roomName });
  }
}
