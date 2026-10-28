import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function rejectCookies(page: Page) {
  await page.getByRole("button", { name: "Reject", exact: true }).click();
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function fillBase(page: Page) {
  await page.getByLabel("Company name").fill("Example Company");
  await page.getByLabel("Full name").fill("Test Person");
  await page.getByLabel("Work email").fill("browser@example.test");
  await page.getByLabel("Mobile (+91)", { exact: false }).fill("9876543210");
  await choose(page, "Team size", "1–5");
  await page.getByRole("checkbox").check();
}
async function fillContactDetails(page: Page) {
  await page.getByLabel("Company name").fill("Example Company");
  await page.getByLabel("Full name").fill("Test Person");
  await page.getByLabel("Work email").fill("browser@example.test");
  await page.getByLabel("Mobile (+91)", { exact: false }).fill("9876543210");
  await page.getByRole("checkbox").check();
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
        ],
        timezone: "Asia/Kolkata",
      },
    });
  });
}
async function mockLead(page: Page, preview = false) {
  await page.route("**/api/leads", (route) =>
    route.fulfill({
      json: {
        leadId: "landing-e2e-lead",
        statusToken: "landing-e2e-token",
        eventId: "landing-e2e-event",
        preview,
      },
    }),
  );
}
test("approved content, responsive layout and screenshot", async ({
  page,
}, info) => {
  await page.goto("/");
  await rejectCookies(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Leads Are Coming In.Are They Moving Forward?",
  );
  await expect(
    page.getByText("Available on supported configurations"),
  ).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-landing.png`,
    fullPage: true,
  });
});
test("demo booking shows host availability first and asks only for contact details", async ({
  page,
}) => {
  await mockAvailability(page);
  await mockLead(page);
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    await route.fulfill({
      json: {
        status: "CONFIRMED",
        uid: "google:e2e-demo",
        startAt: data.startAt,
        timezone: "Asia/Kolkata",
      },
    });
  });
  await page.goto("/");
  await rejectCookies(page);
  await page.getByRole("button", { name: "Book Free Demo" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /10:30 am with Khushi/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /10:30 am with Khushi/i }).click();
  await page.getByRole("button", { name: /Continue with Khushi/ }).click();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: /Book with Khushi/ }).click();
  await expect(page.getByText("Full name is required")).toBeVisible();
  await fillContactDetails(page);
  const leadRequest = page.waitForResponse(
    (r) => r.url().endsWith("/api/leads") && r.request().method() === "POST",
  );
  const bookingRequest = page.waitForResponse(
    (r) => r.url().endsWith("/api/bookings") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Book with Khushi/ }).click();
  expect((await leadRequest).status()).toBe(200);
  expect((await bookingRequest).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close enquiry" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Get Started redirects to CRM registration", async ({ page }) => {
  await page.goto("/");
  await page.route("https://crm.bizgenix.ai/register**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "Registered",
    }),
  );
  await page
    .getByRole("button", { name: "Get Started", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/^https:\/\/crm\.bizgenix\.ai\/register/);
});
test("plan enquiries still open the enquiry form", async ({ page }) => {
  await mockLead(page, true);
  await page.goto("/");
  await rejectCookies(page);
  await page
    .locator("#plans")
    .getByRole("button", { name: "Get Plan Details" })
    .first()
    .click();
  await expect(
    page.getByRole("combobox", { name: "Plan interest" }),
  ).toContainText("5 Users");
  await fillBase(page);
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page.getByText("Your preview enquiry was saved.")).toBeVisible();
  await page.getByRole("button", { name: "Close enquiry" }).click();
});
test("network failure keeps entered details and offers retry", async ({
  page,
}) => {
  await page.route("**/api/leads", (r) =>
    r.fulfill({ status: 503, json: { error: "Please try again." } }),
  );
  await page.goto("/");
  await rejectCookies(page);
  await page
    .locator("#plans")
    .getByRole("button", { name: "Get Plan Details" })
    .first()
    .click();
  await fillBase(page);
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page.getByRole("alert")).toContainText("Please try again.");
  await expect(page.getByLabel("Company name")).toHaveValue("Example Company");
});
test("consent and once-only tracking contain no PII", async ({ page }) => {
  await mockAvailability(page);
  await mockLead(page);
  await page.route("**/api/bookings", async (route) => {
    const data = route.request().postDataJSON();
    await route.fulfill({
      json: {
        status: "CONFIRMED",
        uid: "google:tracked-demo",
        startAt: data.startAt,
        timezone: "Asia/Kolkata",
      },
    });
  });
  await page.goto("/?utm_source=qa&utm_campaign=browser");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page
    .getByRole("button", { name: "Book Free Demo", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /10:30 am with Khushi/i }).click();
  await page.getByRole("button", { name: /Continue with Khushi/ }).click();
  await fillContactDetails(page);
  await page.getByRole("button", { name: /Book with Khushi/ }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  const entries = await page.evaluate(() => window.dataLayer);
  const leadEvents = entries.filter(
    (v) => (v as { event?: string }).event === "generate_lead",
  );
  expect(leadEvents).toHaveLength(1);
  expect(JSON.stringify(leadEvents)).not.toContain("browser@example.test");
  await page.getByRole("button", { name: "Close enquiry" }).click();
  await page.getByRole("button", { name: "Change cookie preferences" }).click();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("bizgenix-consent-v1")),
  ).toBe("rejected");
});
test("keyboard dialog, FAQ and WCAG audit", async ({ page }) => {
  await page.goto("/");
  await rejectCookies(page);
  await page.getByRole("button", { name: "Is AI calling included?" }).click();
  await expect(
    page.getByText("Availability, activation and usage charges depend"),
  ).toBeVisible();
  const baseline = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(baseline.violations).toEqual([]);
  const trigger = page.getByRole("button", { name: "Book Free Demo" }).first();
  await trigger.click();
  const modal = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(modal.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("mobile drawer, CTA and narrow-screen overflow", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  await rejectCookies(page);
  await expect(page.locator(".mobile-cta")).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Features" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
