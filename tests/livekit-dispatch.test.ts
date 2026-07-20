import assert from "node:assert/strict";
import test from "node:test";
import {
  LiveKitDispatchError,
  dispatchAndWaitForAgent,
  normalizeLiveKitUrl,
  type LiveKitDispatchClients,
} from "../lib/livekit/dispatch-core";

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
    timeoutMs: 50,
    pollMs: 1,
  });
  assert.equal(result.agent.identity, "agent-1");
  assert.equal(result.dispatch.id, "dispatch-1");
});

test("dispatch timeout cleans the room and preserves the support id", async () => {
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
      error.code === "AGENT_TIMEOUT" &&
      error.supportId === "support-timeout",
  );
  assert.equal(deleted, "assessment-timeout");
});
