import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openCalendar(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByRole("button", { name: "Book Free Demo" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Choose an open time." }),
  ).toBeVisible();
}

async function mockAvailability(page: Page) {
  await page.route("**/api/availability?**", async (route) => {
    const date = new URL(route.request().url()).searchParams.get("date");
    await route.fulfill({
      json: {
        slots: [
          {
            startAt: new Date(`${date}T10:30:00+05:30`).toISOString(),
            presenter: "khushi@bizgenix.ai",
          },
          {
            startAt: new Date(`${date}T11:00:00+05:30`).toISOString(),
            presenter: "pranesh@bizgenix.ai",
          },
        ],
        timezone: "Asia/Kolkata",
      },
    });
  });
  await page.route("**/api/leads", (route) =>
    route.fulfill({
      json: {
        leadId: "test-lead",
        statusToken: "test-token",
        eventId: "lead:test-lead",
        preview: false,
      },
    }),
  );
}

async function fillDetails(page: Page) {
  await page.getByLabel("Company name").fill("Calendar UI Test");
  await page.getByLabel("Full name").fill("Test Guest");
  await page.getByLabel("Work email").fill("calendar-ui@example.test");
  await page.getByLabel("Mobile (+91)", { exact: false }).fill("9876543210");
  await page.getByRole("checkbox").check();
}

async function selectFirstSlot(page: Page) {
  await page
    .getByRole("group", { name: "Available appointment times" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: /Continue with Khushi/ }).click();
}

test("guests choose a host slot before entering details and retry a taken slot", async ({
  page,
}) => {
  await mockAvailability(page);
  const requests: { startAt: string; presenter: string }[] = [];
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    requests.push(data);
    if (requests.length === 1)
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
  await expect(
    page.getByRole("button", { name: /10:30 am with Khushi/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /11:00 am with Pranesh/i }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(audit.violations).toEqual([]);

  await selectFirstSlot(page);
  await fillDetails(page);
  await page.getByRole("button", { name: /Book with Khushi/ }).click();
  await expect(page.getByRole("alert")).toContainText("just taken");
  await expect(
    page.getByRole("region", { name: "Choose a date" }),
  ).toBeVisible();

  await page
    .getByRole("group", { name: "Available appointment times" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "Book this time" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await expect(
    page.getByText("Your meeting with Pranesh", { exact: false }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0].presenter).toBe("khushi@bizgenix.ai");
  expect(requests[1].presenter).toBe("pranesh@bizgenix.ai");
});

test("an ambiguous calendar response locks and retries the same host and time", async ({
  page,
}) => {
  await mockAvailability(page);
  const requests: { startAt: string; presenter: string }[] = [];
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    requests.push(data);
    if (requests.length === 1)
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
  await selectFirstSlot(page);
  await fillDetails(page);
  await page.getByRole("button", { name: /Book with Khushi/ }).click();
  await expect(page.getByRole("button", { name: "Change" })).toBeDisabled();
  await page.getByRole("button", { name: "Check and retry booking" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
});

test("availability is public but booking still requires a valid booking session", async ({
  request,
}) => {
  const invalidDate = await request.get("/api/availability?date=not-a-date");
  expect(invalidDate.status()).toBe(422);
  const booking = await request.post("/api/bookings", {
    data: {
      leadId: "unknown",
      startAt: "2026-10-26T05:00:00.000Z",
      presenter: "khushi@bizgenix.ai",
    },
    headers: { Origin: "http://localhost:3100" },
  });
  expect(booking.status()).toBe(401);
});
