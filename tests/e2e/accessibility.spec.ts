import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 900 },
  { name: "1280", width: 1280, height: 800 },
] as const;

for (const viewport of viewports) {
  test(`empty state is accessible at ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({
      path: `test-results/empty-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

test("mobile navigation supports keyboard focus and escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: /відкрити меню/i });
  await menuButton.focus();
  await expect(menuButton).toBeFocused();
  await menuButton.press("Enter");
  await expect(page.getByText("НОВИЙ ЧАТ")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /відкрити меню/i })
  ).toBeVisible();
});

test("interactive controls meet the minimum touch target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const controls = page.locator("button, a");
  const sizes = await controls.evaluateAll(elements =>
    elements.map(element => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        text: element.textContent?.trim(),
      };
    })
  );
  expect(
    sizes
      .filter(size => size.width > 0 && size.height > 0)
      .every(size => size.width >= 44 && size.height >= 44)
  ).toBe(true);
});
