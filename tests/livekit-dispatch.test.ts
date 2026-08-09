import assert from "node:assert/strict";
import test from "node:test";
import {
  LiveKitDispatchError,
  dispatchAndWaitForAgent,
  normalizeLiveKitUrl,
  type LiveKitDispatchClients,
} from "../lib/livekit/dispatch-core";
import { agentDispatchRoomConfiguration } from "../lib/livekit/dispatch-core";

test("token dispatch carries the agent name and bounded job metadata", () => {
  const metadata = JSON.stringify({ assessmentId: "assessment-1", sessionKey: "session-1" });
  const config = agentDispatchRoomConfiguration("quisqueyatech-assessment", metadata);
  assert.equal(config.agents.length, 1);
  assert.equal(config.agents[0]?.agentName, "quisqueyatech-assessment");
  assert.equal(config.agents[0]?.metadata, metadata);
});

test("LiveKit URLs must match the configured project", () => {
  assert.deepEqual(
    normalizeLiveKitUrl(
      "wss://live-translate-r87y5gh3.livekit.cloud",
      "live-translate-r87y5gh3.livekit.cloud",
    ),
    {
      apiUrl: "https://live-translate-r87y5gh3.livekit.cloud/",
      hostname: "live-translate-r87y5gh3.livekit.cloud",
    },
  );
  assert.throws(
    () =>
      normalizeLiveKitUrl(
        "wss://another-project.livekit.cloud",
        "live-translate-r87y5gh3.livekit.cloud",
      ),
    /project mismatch/i,
  );
});

test("dispatch waits until an agent participant is ready", async () => {
  let polls = 0;
  const clients: LiveKitDispatchClients = {
    dispatch: {
      createDispatch: async (room, agentName) => ({ id: "dispatch-1", room, agentName }),
    },
    rooms: {
      listParticipants: async () => {
        polls += 1;
        return polls > 1 ? [{ identity: "agent-1", kind: 4 }] : [];
      },
      deleteRoom: async () => assert.fail("successful rooms must remain open"),
    },
  };
  const result = await dispatchAndWaitForAgent({
    clients,
    roomName: "assessment-test",
    agentName: "quisqueyatech-assessment",
    metadata: "{}",
    supportId: "support-1",
    timeoutMs: 1_000,
    pollMs: 1,
  });
  assert.equal(result.agent.identity, "agent-1");
  assert.equal(result.dispatch.id, "dispatch-1");
});

test("cold-start timeout preserves the recoverable room and support id", async () => {
  let deleted = "";
  const clients: LiveKitDispatchClients = {
    dispatch: {
      createDispatch: async (room, agentName) => ({ id: "dispatch-2", room, agentName }),
    },
    rooms: {
      listParticipants: async () => [],
      deleteRoom: async (room) => {
        deleted = room;
      },
    },
  };
  await assert.rejects(
    dispatchAndWaitForAgent({
      clients,
      roomName: "assessment-timeout",
      agentName: "quisqueyatech-assessment",
      metadata: "{}",
      supportId: "support-timeout",
      timeoutMs: 5,
      pollMs: 1,
    }),
    (error: unknown) =>
      error instanceof LiveKitDispatchError &&
      error.code === "AGENT_COLD_START_TIMEOUT" &&
      error.supportId === "support-timeout" &&
      error.dispatch?.id === "dispatch-2",
  );
  assert.equal(deleted, "");
});

test("terminal agent startup errors are classified and clean up the room", async () => {
  let deleted = "";
  const clients: LiveKitDispatchClients = {
    dispatch: {
      createDispatch: async (room, agentName) => ({ id: "dispatch-3", room, agentName }),
    },
    rooms: {
      listParticipants: async () => [
        { identity: "agent-configuration-error", kind: 4, metadata: "configuration_error" },
      ],
      deleteRoom: async (room) => {
        deleted = room;
      },
    },
  };
  await assert.rejects(
    dispatchAndWaitForAgent({
      clients,
      roomName: "assessment-invalid-config",
      agentName: "quisqueyatech-assessment",
      metadata: "{}",
      supportId: "support-invalid-config",
      timeoutMs: 50,
      pollMs: 1,
      agentFailure: (participant) =>
        participant.metadata === "configuration_error" ? "AGENT_CONFIGURATION" : undefined,
    }),
    (error: unknown) =>
      error instanceof LiveKitDispatchError && error.code === "AGENT_CONFIGURATION",
  );
  assert.equal(deleted, "assessment-invalid-config");
});

test("diagnostic readiness requires successful diagnostic metadata", async () => {
  let deleted = "";
  const clients: LiveKitDispatchClients = {
    dispatch: {
      createDispatch: async (room, agentName) => ({ id: "dispatch-4", room, agentName }),
    },
    rooms: {
      listParticipants: async () => [
        {
          identity: "agent-diagnostic",
          kind: 4,
          metadata: JSON.stringify({ diagnosticComplete: true, success: true, code: "READY" }),
        },
      ],
      deleteRoom: async (room) => {
        deleted = room;
      },
    },
  };
  const result = await dispatchAndWaitForAgent({
    clients,
    roomName: "diagnostic-ready",
    agentName: "quisqueyatech-assessment",
    metadata: "{}",
    supportId: "support-diagnostic",
    timeoutMs: 50,
    pollMs: 1,
    agentReady: (participant) =>
      participant.metadata?.includes('"diagnosticComplete":true') === true,
  });
  assert.equal(result.agent.identity, "agent-diagnostic");
  assert.equal(deleted, "");
});
