import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { alternatePath, localeFromPath, withLocale } from "../lib/i18n";
import {
  assessmentConferenceStartSchema,
  assessmentIntakeSchema,
  bookingSchema,
} from "../lib/validations/assessment";
import { findPost, postsForLocale } from "../lib/content";
import { aiActionSchema, postInputSchema } from "../lib/validations/content";
import { AssessmentInterviewEngine, createAssessmentSnapshot } from "../lib/assessment/engine";
import { crossedThresholds } from "../lib/assessment/scheduler";
import type { AssessmentEvidence, AssessmentFieldKey } from "../lib/assessment/types";
import { enforceAssessmentDataPolicy, redactSensitiveText } from "../lib/assessment/data-policy";
import { normalizeVoiceStatus } from "../lib/voice/status";

test("localized paths round-trip", () => {
  assert.equal(localeFromPath("/en/solutions"), "en");
  assert.equal(localeFromPath("/soluciones"), "es");
  assert.equal(withLocale("en", "/evaluacion"), "/en/evaluacion");
  assert.equal(alternatePath("/en/about"), "/nosotros");
  assert.equal(alternatePath("/nosotros"), "/en/about");
  assert.equal(
    alternatePath("/soluciones/agentes-de-ia"),
    "/en/solutions/ai-agents",
  );
});

test("assessment intake requires international mobile and both consents", () => {
  const valid = {
    firstName: "Ana",
    lastName: "Pérez",
    company: "Acme",
    role: "Directora",
    country: "DO",
    locale: "es",
    email: "ana@example.com",
    phone: "+18095551234",
    processingConsent: true,
    recordingConsent: true,
  };
  assert.equal(assessmentIntakeSchema.safeParse(valid).success, true);
  assert.equal(
    assessmentIntakeSchema.safeParse({ ...valid, phone: "8095551234" }).success,
    false,
  );
  assert.equal(
    assessmentIntakeSchema.safeParse({ ...valid, recordingConsent: false })
      .success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({
      ...valid,
      start: new Date().toISOString(),
      timezone: "America/Santo_Domingo",
      channel: "web",
    }).success,
    true,
  );
});

test("voice conference starts without requesting contact details", () => {
  const valid = {
    locale: "es",
    processingConsent: true,
    recordingConsent: true,
  };
  assert.equal(assessmentConferenceStartSchema.safeParse(valid).success, true);
  assert.equal(
    assessmentConferenceStartSchema.safeParse({
      ...valid,
      recordingConsent: false,
    }).success,
    false,
  );
});

test("seed resources have bilingual counterparts", () => {
  const spanish = postsForLocale("es");
  const english = postsForLocale("en");
  assert.ok(spanish.length > 0);
  assert.ok(
    english.some((post) => post.translationKey === spanish[0].translationKey),
  );
  assert.equal(findPost("es", spanish[0].slug)?.title, spanish[0].title);
});

test("production navigation has no direct WhatsApp contact", async () => {
  const files = [
    "components/layout/navbar.tsx",
    "components/layout/footer.tsx",
    "components/sections/home.tsx",
  ];
  for (const file of files)
    assert.doesNotMatch(
      await readFile(file, "utf8"),
      /wa\.me|whatsappHref|Enviar mi caso por WhatsApp/i,
    );
});

test("editorial content requires complete scheduled publishing data", () => {
  const base = { locale: "es", slug: "guia-practica", title: "Guía práctica", excerpt: "Un resumen suficientemente descriptivo.", body: "## Contenido\n\nUna explicación completa y verificable.", status: "draft" };
  assert.equal(postInputSchema.safeParse(base).success, true);
  assert.equal(postInputSchema.safeParse({ ...base, status: "scheduled" }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, status: "scheduled", publishedAt: Date.now() + 60_000 }).success, true);
  assert.equal(postInputSchema.safeParse({ ...base, status: "scheduled", publishedAt: Date.now() - 60_000 }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, status: "published", imageId: "storage-id" }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, status: "published", imageId: "storage-id", imageAlt: "Equipo colaborando frente a una pantalla" }).success, true);
  assert.equal(postInputSchema.safeParse({ ...base, slug: "Slug Inválido" }).success, false);
});

test("AI editorial actions require a useful brief and valid sources", () => {
  assert.equal(aiActionSchema.safeParse({ action: "draft", locale: "es", brief: "Crear una guía sobre automatización", sources: ["https://example.com/source"] }).success, true);
  assert.equal(aiActionSchema.safeParse({ action: "draft", locale: "es", brief: "x", sources: [] }).success, false);
  assert.equal(aiActionSchema.safeParse({ action: "draft", locale: "es", brief: "Contenido válido", sources: ["not-a-url"] }).success, false);
});

test("Easy!Appointments is documented as external infrastructure", async () => {
  await assert.rejects(readFile("infra/easy-appointments/compose.yml", "utf8"));
  assert.match(await readFile("infra/easy-appointments/README.md", "utf8"), /servicio independiente en el VPS/i);
});

test("the provider-neutral interview engine produces a complete deterministic snapshot", () => {
  const engine = new AssessmentInterviewEngine();
  const fields: AssessmentFieldKey[] = [
    "name", "company", "role", "email", "phone", "businessContext",
    "candidateProcesses", "priorityProcess", "trigger", "outcome", "owners",
    "tools", "steps", "exceptions", "volume", "manualWork", "pain", "impact",
    "desiredOutcome", "successMetric", "constraints", "validators",
  ];
  const updates: AssessmentEvidence[] = fields.map((field) => ({
    field,
    value: field === "email" ? "ana@example.com" : field === "phone" ? "+18095551234" : `value-${field}`,
    evidence: `evidence-${field}`,
    status: "confirmed",
    confidence: 0.95,
  }));
  const output = engine.advance(createAssessmentSnapshot("es", 1), {
    assessmentId: "assessment-1",
    eventId: "00000000-0000-4000-8000-000000000001",
    reason: "answer",
    elapsedSeconds: 720,
    updates,
  }, 2);
  assert.equal(output.coverageScore, 100);
  assert.equal(output.snapshot.complete, true);
  assert.deepEqual(output.essentialMissing, []);
  assert.equal(output.snapshot.stage, "complete");
});

test("interview engine caps confidence, elapsed time, and probes", () => {
  const engine = new AssessmentInterviewEngine();
  let snapshot = createAssessmentSnapshot("en", 1);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    snapshot = engine.advance(snapshot, {
      assessmentId: "assessment-2",
      eventId: `00000000-0000-4000-8000-${String(attempt + 1).padStart(12, "0")}`,
      reason: "answer",
      elapsedSeconds: 1_000,
      updates: [{ field: "email", value: "unclear", evidence: "unclear", status: "pending", confidence: 5 }],
    }, attempt + 2).snapshot;
  }
  assert.equal(snapshot.probeCounts.email, 2);
  assert.equal(snapshot.fields.email?.confidence, 1);
  assert.equal(snapshot.elapsedSeconds, 900);
});

test("guidance scheduler emits every crossed threshold exactly once per interval", () => {
  assert.deepEqual(crossedThresholds(299, 601).map(({ key }) => key), ["process-selected", "workflow-impact"]);
  assert.deepEqual(crossedThresholds(600, 779), []);
  assert.deepEqual(crossedThresholds(869, 900).map(({ key }) => key), ["close", "hard-stop"]);
});

test("sensitive values are redacted before they reach the assessment snapshot", () => {
  const result = enforceAssessmentDataPolicy([{ field: "constraints", value: "API key: abcdefghijklmnop", evidence: "The password: super-secret", status: "confirmed", confidence: 1 }]);
  assert.equal(result.updates[0].status, "pending");
  assert.doesNotMatch(result.updates[0].value, /abcdefghijklmnop/);
  assert.doesNotMatch(result.updates[0].evidence, /super-secret/);
  assert.equal(result.alerts.length, 2);
  assert.equal(redactSensitiveText("card 4111 1111 1111 1111").redacted, true);
});

test("invalid contact cannot become confirmed and exhausted probes no longer block the interview", () => {
  const engine = new AssessmentInterviewEngine();
  let snapshot = createAssessmentSnapshot("es", 1);
  const identity: AssessmentEvidence[] = ["name", "company", "role", "phone"].map((field) => ({ field: field as AssessmentFieldKey, value: field === "phone" ? "+18095551234" : field, evidence: field, status: "confirmed", confidence: 1 }));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    snapshot = engine.advance(snapshot, { assessmentId: "assessment-3", eventId: `00000000-0000-4000-8000-${String(attempt + 20).padStart(12, "0")}`, reason: "answer", elapsedSeconds: 30, updates: [...(attempt === 0 ? identity : []), { field: "email", value: "not-an-email", evidence: "not-an-email", status: "confirmed", confidence: 1 }] }, attempt + 2).snapshot;
  }
  assert.equal(snapshot.fields.email?.status, "pending");
  assert.equal(snapshot.probeCounts.email, 2);
  assert.equal(snapshot.stage, "context");
  assert.equal(snapshot.revision, 2);
});

test("provider states normalize to the UI contract", () => {
  assert.equal(normalizeVoiceStatus("reconnecting"), "reconnecting");
  assert.equal(normalizeVoiceStatus("disconnected"), "ended");
  assert.equal(normalizeVoiceStatus("failure"), "error");
  assert.equal(normalizeVoiceStatus("speaking"), "speaking");
});

test("production boundaries require assessment authorization", async () => {
  assert.match(await readFile("app/api/assessment/complete/route.ts", "utf8"), /verifyAssessmentToken/);
  assert.match(await readFile("convex/assessments.ts", "utf8"), /requireService\(args\.serviceSecret\)/);
  assert.match(await readFile("lib/server/assessment-tokens.ts", "utf8"), /required in production/);
});

test("agent content input rejects privileged editorial fields", async () => {
  const { agentPostSchema, transitionSchema } = await import("../lib/validations/content-agent");
  const base = { locale: "es", slug: "borrador-agente", title: "Borrador del agente", excerpt: "Un resumen suficientemente descriptivo.", body: "## Contenido\n\nUna explicación completa para revisión humana." };
  assert.equal(agentPostSchema.safeParse(base).success, true);
  assert.equal(agentPostSchema.safeParse({ ...base, status: "published" }).success, false);
  assert.equal(agentPostSchema.safeParse({ ...base, publishedAt: Date.now() }).success, false);
  assert.equal(transitionSchema.safeParse({ expectedUpdatedAt: Date.now() }).success, true);
});

test("Clerk is absent from application boundaries", async () => {
  assert.doesNotMatch(await readFile("package.json", "utf8"), /@clerk\/nextjs/);
  assert.doesNotMatch(await readFile("app/layout.tsx", "utf8"), /ClerkProvider/);
  await assert.rejects(readFile("app/api/admin/posts/route.ts", "utf8"));
});

test("custom authentication primitives validate hashes and safe redirects", async () => {
  const { safeReturnTo, tokenHash, isAgentToken } = await import("../lib/auth-core");
  assert.equal(safeReturnTo("https://evil.example/admin"), "/admin");
  assert.equal(safeReturnTo("/admin?area=agents"), "/admin?area=agents");
  assert.equal(tokenHash("same"), tokenHash("same"));
  assert.equal(isAgentToken(`qta_abcdefgh_${randomBytes(32).toString("base64url")}`), true);
});
