import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { alternatePath, localeFromPath, withLocale } from "../lib/i18n";
import {
  assessmentConferenceStartSchema,
  assessmentIntakeSchema,
  bookingSchema,
} from "../lib/validations/assessment";
import { findPost, postsForLocale } from "../lib/content";
import { aiActionSchema, postInputSchema } from "../lib/validations/content";

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
