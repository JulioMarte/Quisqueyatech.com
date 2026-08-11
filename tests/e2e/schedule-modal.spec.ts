import { expect, test, type Page } from "@playwright/test";

async function openScheduler(page: Page) {
  await page.goto("/?agendar=1");
  return page.getByRole("dialog", { name: /Cuéntanos de ti y tu empresa/i });
}

async function completeContactStep(page: Page) {
  await page.getByLabel("Nombre").fill("Ana");
  await page.getByLabel("Apellido").fill("Pérez");
  await page.getByLabel(/Correo/).fill("ana@example.com");
  await page.getByLabel(/Celular/).fill("+18095551234");
}

test("messaging consent is optional and starts unchecked", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await openScheduler(page);
  const optIn = page.getByLabel(/Acepto recibir de QuisqueyaTech/);
  await expect(optIn).not.toBeChecked();
  await completeContactStep(page);
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  await expect(page.getByRole("heading", { name: "Elige un día disponible" })).toBeVisible();
});

test("the global site language controls the modal without an additional toggle", async ({
  page,
}) => {
  await page.goto("/en?agendar=1");
  await expect(
    page.getByRole("dialog", { name: /Tell us about you and your company/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/I agree to receive appointment confirmations/)).not.toBeChecked();
  await expect(page.getByLabel("Select language")).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/scheduling/availability?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        slots: [{ start: "2030-01-15T14:00:00.000Z", label: "10:00 AM" }],
      }),
    });
  });
});

test("the centered stepper validates navigation and preserves entered data", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  const dialog = await openScheduler(page);
  await expect(dialog).toBeVisible();

  const detailsStep = page.getByRole("button", { name: /Ir al paso 1: Tus datos/ });
  const dateStep = page.getByRole("button", { name: /Ir al paso 2: Fecha/ });
  const timeStep = page.getByRole("button", { name: /Ir al paso 3: Hora/ });
  await expect(detailsStep).toHaveAttribute("aria-current", "step");
  await expect(dateStep).toBeEnabled();
  await expect(timeStep).toBeDisabled();

  await dateStep.click();
  await expect(dialog.getByRole("alert")).toContainText("Por favor escribe tu nombre.");
  await expect(page.getByLabel("Nombre")).toBeFocused();

  await completeContactStep(page);
  await expect(page.getByRole("heading", { name: "Cuéntanos de ti y tu empresa" })).toBeVisible();
  await dateStep.click();
  await expect(page.getByRole("heading", { name: "Elige un día disponible" })).toBeFocused();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  await expect(page.getByRole("heading", { name: "Elige la hora" })).toBeFocused();

  await detailsStep.click();
  await expect(page.getByLabel("Nombre")).toHaveValue("Ana");
  await expect(page.getByLabel("Apellido")).toHaveValue("Pérez");
  await expect(timeStep).toBeDisabled();
});

test("availability loading blocks stale navigation and confirmation submits only once", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  let bookings = 0;
  await page.route("**/api/scheduling/book", async (route) => {
    bookings += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ bookingId: "booking-e2e", configured: true, confirmed: true }),
    });
  });

  await openScheduler(page);
  await expect(page.locator('ol[aria-label="Progreso"]')).toBeHidden();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeHidden();
  await completeContactStep(page);
  await page.getByRole("button", { name: "Siguiente paso" }).click();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  await expect(page.getByRole("heading", { name: "Elige la hora" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paso anterior" })).toBeVisible();

  const confirm = page.getByRole("button", { name: "Confirmar evaluación" });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "10:00 AM" }).click();
  await expect(confirm).toBeEnabled();
  expect(bookings).toBe(0);

  await expect(page.getByRole("button", { name: "Siguiente paso" })).toHaveCount(0);
  await confirm.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByText("Cita confirmada")).toBeVisible();
  await expect(page.getByRole("button", { name: /Ir al paso/ })).toHaveCount(0);
  expect(bookings).toBe(1);
});

test("a date without slots stays on the calendar and an offline calendar blocks booking with retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.unroute("**/api/scheduling/availability?**");
  let configured = true;
  await page.route("**/api/scheduling/availability?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ configured, slots: [] }),
    });
  });

  await openScheduler(page);
  await completeContactStep(page);
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  await expect(page.getByRole("heading", { name: "Elige un día disponible" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar a hora" })).toBeDisabled();

  configured = false;
  await page.getByRole("grid").locator("button:not([disabled])").nth(1).click();
  await expect(page.getByRole("heading", { name: /Elige un día/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar a hora" })).toBeDisabled();
});

test("only the latest date response may auto-advance", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.unroute("**/api/scheduling/availability?**");
  let requestNumber = 0;
  await page.route("**/api/scheduling/availability?**", async (route) => {
    requestNumber += 1;
    const current = requestNumber;
    await new Promise((resolve) => setTimeout(resolve, current === 1 ? 400 : 50));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        slots: current === 1 ? [] : [{ start: "2030-01-16T14:00:00.000Z", label: "10:00 AM" }],
      }),
    });
  });

  await openScheduler(page);
  await completeContactStep(page);
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  const availableDays = page.getByRole("grid").locator("button:not([disabled])");
  await availableDays.first().click();
  await availableDays.nth(1).click();
  await expect(page.getByRole("heading", { name: "Elige la hora" })).toBeVisible();
  await expect(page.getByRole("button", { name: "10:00 AM" })).toBeEnabled();
  await page.waitForTimeout(450);
  await expect(page.getByRole("heading", { name: "Elige la hora" })).toBeVisible();
});

test("localized server labels remain selectable", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.unroute("**/api/scheduling/availability?**");
  await page.route("**/api/scheduling/availability?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        slots: [{ start: "2030-01-15T13:00:00.000Z", label: "9:00 a. m." }],
      }),
    }),
  );
  await openScheduler(page);
  const dialog = page.getByRole("dialog");
  const dateStep = page.getByRole("button", { name: /Ir al paso 2: Fecha/ });
  await completeContactStep(page);
  await page.getByLabel(/Correo/).clear();
  await dateStep.click();
  await expect(dialog.getByRole("alert")).toContainText("correo electrónico válido");
  await expect(page.getByLabel(/Correo/)).toBeFocused();
  await page.getByLabel(/Correo/).fill("ana@example.com");
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  const localizedSlot = page.getByRole("button", { name: "9:00 a. m." });
  await expect(localizedSlot).toBeEnabled();
  await localizedSlot.click();
  await expect(page.getByRole("button", { name: "Confirmar evaluación" })).toBeEnabled();
});

test("uses the browser IANA timezone in availability, booking, and human confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.addInitScript(() => {
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function resolvedOptions() {
      return { ...original.call(this), timeZone: "America/New_York" };
    };
  });
  await page.unroute("**/api/scheduling/availability?**");
  const availabilityZones: string[] = [];
  await page.route("**/api/scheduling/availability?**", async (route) => {
    availabilityZones.push(new URL(route.request().url()).searchParams.get("timezone") ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        slots: [{ start: "2030-07-15T14:00:00.000Z", label: "10:00 a. m." }],
      }),
    });
  });
  let bookingTimezone = "";
  await page.route("**/api/scheduling/book", async (route) => {
    bookingTimezone = (route.request().postDataJSON() as { timezone: string }).timezone;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ bookingId: "timezone-e2e", configured: true, confirmed: true }),
    });
  });

  await openScheduler(page);
  await completeContactStep(page);
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  await expect(page.getByText("Horarios en New York (UTC−4)")).toBeVisible();
  await page.getByRole("button", { name: "10:00 a. m." }).click();
  await page.getByRole("button", { name: /Confirmar evaluaci/ }).click();
  await expect(page.getByText(/New York \(UTC−4\)/)).toBeVisible();
  expect(availabilityZones).toEqual(["America/New_York"]);
  expect(bookingTimezone).toBe("America/New_York");
});

test("time wheel scrolls smoothly in both directions and keeps selection centered", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.unroute("**/api/scheduling/availability?**");
  await page.route("**/api/scheduling/availability?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        configured: true,
        slots: [
          { start: "2030-01-15T13:00:00.000Z", label: "9:00 a. m." },
          { start: "2030-01-15T13:15:00.000Z", label: "9:15 a. m." },
          { start: "2030-01-15T13:30:00.000Z", label: "9:30 a. m." },
        ],
      }),
    }),
  );
  await openScheduler(page);
  await completeContactStep(page);
  await page.getByRole("button", { name: "Continuar a fecha" }).click();
  await page.getByRole("grid").locator("button:not([disabled])").first().click();
  await page.getByRole("button", { name: "9:15 a. m." }).click();
  const wheel = page.getByTestId("time-wheel");
  await wheel.hover();
  await page.mouse.wheel(0, -120);
  await expect(page.getByRole("button", { name: /9:00 a\. m\./ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.waitForTimeout(200);
  await page.mouse.wheel(0, 120);
  const selected = page.getByRole("button", { name: /9:15 a\. m\./ });
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => {
      const [wheelBox, selectedBox] = await Promise.all([
        wheel.boundingBox(),
        selected.boundingBox(),
      ]);
      if (!wheelBox || !selectedBox) return Infinity;
      return Math.abs(wheelBox.y + wheelBox.height / 2 - (selectedBox.y + selectedBox.height / 2));
    })
    .toBeLessThan(3);
  await wheel.focus();
  await wheel.press("ArrowDown");
  await expect(page.getByRole("button", { name: /9:30 a\. m\./ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await wheel.press("ArrowUp");
  await expect(page.getByRole("button", { name: /9:15 a\. m\./ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("responsive layouts keep the modal inside the viewport and reserve side arrows for wide screens", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dialog = await openScheduler(page);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.width >= 768) expect(box!.width).toBeLessThanOrEqual(680);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    await expect(page.getByText(/Tu información está cifrada/)).toHaveCount(0);

    const nextArrow = page.getByRole("button", { name: "Siguiente paso" });
    const progress = page.locator('ol[aria-label="Progreso"]');
    const mobileFooterAction = page.getByText("Continuar a fecha", { exact: true });
    if (viewport.width >= 1024) {
      await expect(nextArrow).toBeVisible();
      await expect(progress).toBeHidden();
      await expect(mobileFooterAction).toBeHidden();
    } else {
      await expect(nextArrow).toBeHidden();
      await expect(progress).toBeVisible();
      await expect(mobileFooterAction).toBeVisible();
    }

    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  }
});
