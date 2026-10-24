import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function openCalendar(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByRole("button", { name: "Book Free Demo" }).first().click();
  await page.getByLabel("Company name").fill("Calendar UI Test");
  await page.getByLabel("Full name").fill("Test Guest");
  await page.getByLabel("Work email").fill("calendar-ui@example.test");
  await page.getByLabel("Mobile (+91)", { exact: false }).fill("9876543210");
  for (const [label, option] of [
    ["Team size", "1–5"],
    ["Industry", "Real Estate"],
  ]) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Get your slot booked" }).click();
}
async function mockAvailability(page: Page) {
  await page.route("**/api/availability?**", async (route) => {
    const date = new URL(route.request().url()).searchParams.get("date");
    await route.fulfill({
      json: {
        slots: [
          new Date(`${date}T10:00:00+05:30`).toISOString(),
          new Date(`${date}T11:00:00+05:30`).toISOString(),
        ],
        timezone: "Asia/Kolkata",
      },
    });
  });
}
test("direct calendar selection handles a taken slot and confirms only the server-confirmed booking", async ({
  page,
}) => {
  await mockAvailability(page);
  let attempts = 0;
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 409,
        json: {
          error:
            "That time was just taken. Please choose another available slot.",
        },
      });
    else
      await route.fulfill({
        json: {
          status: "CONFIRMED",
          uid: "google:mock-confirmed",
          startAt: data.startAt,
          timezone: "Asia/Kolkata",
        },
      });
  });
  await openCalendar(page);
  await expect(page.getByText("30-minute live walkthrough")).toBeVisible();
  const slots = page.getByRole("group", {
    name: "Available appointment times",
  });
  await slots.getByRole("button").first().click();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole("button", { name: "Confirm my demo" }).click();
  await expect(page.getByRole("alert")).toContainText("just taken");
  await expect(page.getByLabel("Choose a date")).toBeEnabled();
  await slots.getByRole("button").first().click();
  await page.getByRole("button", { name: "Confirm my demo" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await expect(
    page.getByText("Google Calendar sends an invitation", { exact: false }),
  ).toBeVisible();
});
test("an ambiguous failure locks the chosen time and retries the same booking", async ({
  page,
}) => {
  await mockAvailability(page);
  const starts: string[] = [];
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    starts.push(data.startAt);
    if (starts.length === 1)
      await route.fulfill({
        status: 503,
        json: { error: "Please retry the same time." },
      });
    else
      await route.fulfill({
        json: {
          status: "CONFIRMED",
          uid: "google:recovered",
          startAt: data.startAt,
          timezone: "Asia/Kolkata",
        },
      });
  });
  await openCalendar(page);
  await page
    .getByRole("group", { name: "Available appointment times" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm my demo" }).click();
  await expect(page.getByLabel("Choose a date")).toBeDisabled();
  await page.getByRole("button", { name: "Check and retry booking" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  expect(starts).toHaveLength(2);
  expect(starts[0]).toBe(starts[1]);
});
test("calendar APIs reject missing booking capability before calling Google", async ({
  request,
}, info) => {
  const baseURL = info.project.use.baseURL!;
  const availability = await request.get(
    "/api/availability?leadId=unknown&date=2026-10-26",
  );
  expect(availability.status()).toBe(401);
  const booking = await request.post("/api/bookings", {
    data: { leadId: "unknown", startAt: "2026-10-26T05:00:00.000Z" },
    headers: { Origin: new URL(baseURL).origin },
  });
  expect(booking.status()).toBe(401);
});
