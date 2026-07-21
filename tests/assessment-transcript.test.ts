import assert from "node:assert/strict";
import test from "node:test";
import { parseAssessmentTranscript } from "../lib/assessment/transcript";

test("normalizes browser transcript turns", () => {
  const turns = parseAssessmentTranscript(
    JSON.stringify([
      { speaker: "user", text: "Necesitamos automatizar reportes." },
      { speaker: "agent", text: "¿Cuánto tiempo toma hoy?" },
    ]),
  );
  assert.equal(turns[0]?.speaker, "user");
  assert.equal(turns[1]?.speaker, "agent");
  assert.equal(turns[0]?.text, "Necesitamos automatizar reportes.");
});

test("normalizes LiveKit chat history content parts", () => {
  const turns = parseAssessmentTranscript(
    JSON.stringify([
      { role: "human", content: [{ text: "Hola" }], timestampMs: 1200 },
      { role: "assistant", content: ["Hola, comencemos."] },
    ]),
  );
  assert.deepEqual(turns, [
    { speaker: "user", text: "Hola", timestampMs: 1200 },
    { speaker: "agent", text: "Hola, comencemos.", timestampMs: undefined },
  ]);
});

test("preserves legacy plain text and handles missing transcripts", () => {
  assert.deepEqual(parseAssessmentTranscript("Texto heredado"), [
    { speaker: "agent", text: "Texto heredado" },
  ]);
  assert.deepEqual(parseAssessmentTranscript(), []);
});
