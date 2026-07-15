import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe.configure({ mode: "serial" });
let recoveryCode = process.env.E2E_ADMIN_RECOVERY_CODE;
const previewOrigin = new URL(process.env.E2E_BASE_URL || "http://localhost:3000").origin;

const adminEndpoints = [
  "/api/admin/v1/assessments",
  "/api/admin/v1/posts",
  "/api/admin/v1/agents",
  "/api/admin/v1/voice-settings",
];

test("anonymous users are redirected and administrative APIs reject access", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fadmin|\/sign-in\?returnTo=\/admin/);
  for (const endpoint of adminEndpoints) {
    const response = await request.get(endpoint);
    expect(response.status(), endpoint).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ data: null, error: "Unauthorized", requestId: expect.any(String) });
  }
});

test("invalid credentials produce a generic rejection", async ({ request }) => {
  const response = await request.post("/api/auth/login", {
    data: { email: `e2e-${crypto.randomUUID()}@invalid.example`, password: "not-a-valid-administrator-password" },
  });
  expect([400, 401, 403, 429]).toContain(response.status());
  const body = await response.json();
  expect(String(body.message || body.error)).not.toMatch(/user not found|account does not exist/i);
});

test("raw Better Auth email entry points are closed", async ({ request }) => {
  for (const endpoint of ["/api/auth/sign-in/email", "/api/auth/sign-up/email"]) {
    const response = await request.post(endpoint, { data: { email: "attacker@example.com", password: "irrelevant-password-value" } });
    expect(response.status(), endpoint).toBe(404);
  }
});

test("sign-in remains usable and accessible at supported widths", async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => item.impact === "critical" || item.impact === "serious"), `${width}px accessibility`).toEqual([]);
  }
});

test("isolated preview has exactly one configured administrator", async ({ request }) => {
  const statusResponse = await request.get("/api/auth/setup/status");
  expect(statusResponse.status()).toBe(200);
  const status = (await statusResponse.json()).data?.status;
  if (status === "uninitialized") {
    if (!process.env.E2E_ADMIN_SETUP_CODE) throw new Error("E2E_ADMIN_SETUP_CODE is required to initialize an isolated preview.");
    const email = `admin-e2e-${crypto.randomUUID()}@example.com`;
    const password = `E2e-${crypto.randomUUID()}-Strong!`;
    const response = await request.post("/api/auth/setup", { headers: { Origin: previewOrigin }, data: { name: "Preview Admin", email, password, setupCode: process.env.E2E_ADMIN_SETUP_CODE } });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.recoveryCodes).toHaveLength(8);
    process.env.E2E_ADMIN_EMAIL = email;
    process.env.E2E_ADMIN_PASSWORD = password;
    recoveryCode = body.data.recoveryCodes[0];
  } else {
    expect(status).toBe("configured");
    if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) throw new Error("Configured previews require E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  }
  const secondSetup = await request.post("/api/auth/setup", { headers: { Origin: previewOrigin }, data: { name: "Second Admin", email: "second@example.com", password: "Second-admin-password-123!", setupCode: process.env.E2E_ADMIN_SETUP_CODE || "x".repeat(24) } });
  expect([403, 429]).toContain(secondSetup.status());
});

test("authenticated administrator can load every panel area and log out", async ({ page, context }) => {
  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required; run this suite only against an isolated preview deployment.");
  await page.goto("/sign-in?returnTo=/admin");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin/);
  for (const name of ["Evaluaciones", "Contenido", "Agentes"]) {
    await page.getByRole("button", { name }).click();
    await expect(page).toHaveURL(new RegExp(`area=${name === "Evaluaciones" ? "assessments" : name === "Contenido" ? "content" : "agents"}`));
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => item.impact === "critical" || item.impact === "serious"), `${name} accessibility`).toEqual([]);
  }
  for (const endpoint of adminEndpoints) expect((await context.request.get(endpoint)).status(), endpoint).toBe(200);
  const report = { subject: "Evaluación preliminar de automatización", executiveSummary: "Resumen ejecutivo suficientemente completo para validar la vista previa administrativa.", processSummary: "Descripción detallada del proceso actual, sus pasos manuales y puntos de fricción observados.", opportunities: [{ title: "Automatizar clasificación", rationale: "Reduce trabajo repetitivo manteniendo revisión humana en las excepciones.", impact: "Menos tiempo manual", confidence: "medium" }], assumptions: ["El volumen se mantiene estable"], openQuestions: ["Confirmar integración disponible"], nextStep: "Validar el proceso y acordar un piloto controlado con métricas claras." };
  const preview = await context.request.post("/api/admin/v1/assessments/preview", { data: { locale: "es", report } });
  expect(preview.status()).toBe(200);
  expect((await preview.json()).data.html).toContain(report.subject);

  const agentResponse = await context.request.post("/api/admin/v1/agents", { data: { name: "E2E Agent", requestLimit: 20, uploadLimit: 2 } });
  expect(agentResponse.status()).toBe(201);
  const pendingAgent = (await agentResponse.json()).data;
  expect((await context.request.get("/api/content/v1/resources", { headers: { Authorization: `Bearer ${pendingAgent.token}` } })).status()).toBe(401);
  expect((await context.request.patch(`/api/admin/v1/agents/${pendingAgent.keyId}`, { data: { action: "activate", activationId: pendingAgent.activationId } })).status()).toBe(200);
  expect((await context.request.get("/api/content/v1/resources", { headers: { Authorization: `Bearer ${pendingAgent.token}` } })).status()).toBe(200);
  expect((await context.request.delete(`/api/admin/v1/agents/${pendingAgent.keyId}`)).status()).toBe(200);

  const post = { locale: "es", slug: `e2e-${crypto.randomUUID()}`, title: "Borrador E2E estable", excerpt: "Resumen suficientemente descriptivo para el borrador E2E.", body: "## Prueba\n\nContenido suficientemente amplio para validar concurrencia editorial.", status: "draft" };
  const createdResponse = await context.request.post("/api/admin/v1/posts", { headers: { "Idempotency-Key": crypto.randomUUID() }, data: post });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()).data;
  const updated = await context.request.patch(`/api/admin/v1/posts/${created.id}`, { data: { ...post, title: "Borrador E2E actualizado", expectedUpdatedAt: created.updatedAt } });
  expect(updated.status()).toBe(200);
  const conflict = await context.request.patch(`/api/admin/v1/posts/${created.id}`, { data: { ...post, title: "Edición obsoleta", expectedUpdatedAt: created.updatedAt } });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).errorCode).toBe("CONFLICT");
  expect((await context.request.delete(`/api/admin/v1/posts/${created.id}`)).status()).toBe(200);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("recovery revokes prior sessions and the old password", async ({ request }) => {
  if (!recoveryCode || !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) throw new Error("A preview recovery code and credentials are required.");
  const newPassword = `Recovered-${crypto.randomUUID()}!`;
  const origin = previewOrigin;
  const response = await request.post("/api/auth/recovery", { headers: { Origin: origin }, data: { code: recoveryCode, password: newPassword } });
  expect(response.status()).toBe(200);
  const oldLogin = await request.post("/api/auth/login", { headers: { Origin: origin }, data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } });
  expect([400, 401, 403, 429]).toContain(oldLogin.status());
  const newLogin = await request.post("/api/auth/login", { headers: { Origin: origin }, data: { email: process.env.E2E_ADMIN_EMAIL, password: newPassword } });
  expect(newLogin.status()).toBe(200);
});
