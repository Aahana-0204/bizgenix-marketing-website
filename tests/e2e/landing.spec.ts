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
test("demo validation, API acceptance and no invented booking", async ({
  page,
}) => {
  await page.goto("/");
  await rejectCookies(page);
  await page.getByRole("button", { name: "Book Free Demo" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Get your slot booked" }).click();
  await expect(page.getByText("Full name is required")).toBeVisible();
  await fillBase(page);
  await choose(page, "Industry", "Real Estate");
  const request = page.waitForResponse(
    (r) => r.url().endsWith("/api/leads") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Get your slot booked" }).click();
  expect((await request).status()).toBe(200);
  await expect(page.getByText("Your details are saved.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close enquiry" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("plan enquiry and Get Started fallback do not force calendar", async ({
  page,
}) => {
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
  await page
    .getByRole("button", { name: "Get Started", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Find the right fit for your team." }),
  ).toBeVisible();
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
  await page.goto("/?utm_source=qa&utm_campaign=browser");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page
    .getByRole("button", { name: "Get Started", exact: true })
    .first()
    .click();
  await fillBase(page);
  await page.getByRole("button", { name: "Send my enquiry" }).click();
  await expect(page.getByText("Your preview enquiry was saved.")).toBeVisible();
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
