import { expect, test } from "@playwright/test";

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

test("authenticated administrator can load every panel area and log out", async ({ page, context }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Set ephemeral E2E administrator credentials to exercise the authenticated flow.");
  await page.goto("/sign-in?returnTo=/admin");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin/);
  for (const name of ["Evaluaciones", "Contenido", "Agentes"]) {
    await page.getByRole("button", { name }).click();
    await expect(page).toHaveURL(new RegExp(`area=${name === "Evaluaciones" ? "assessments" : name === "Contenido" ? "content" : "agents"}`));
  }
  for (const endpoint of adminEndpoints) expect((await context.request.get(endpoint)).status(), endpoint).toBe(200);
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
