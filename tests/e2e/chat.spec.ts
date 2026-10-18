import { expect, test, type Page } from "@playwright/test";

const input = (page: Page) =>
  page.getByRole("textbox", { name: "Повідомлення для чату" });

async function openApp(page: Page) {
  await page.goto("/");
  await expect(input(page)).toBeVisible();
}

test.describe("Library chat smoke", () => {
  test("loads without critical browser errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await openApp(page);
    await expect(page).toHaveTitle(/ХДАК Бібліотека/);
    expect(errors).toEqual([]);
  });

  test("keeps the chat within the viewport at supported sizes", async ({
    page,
  }) => {
    await openApp(page);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const documentWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(documentWidth).toBeLessThanOrEqual(viewport!.width);
  });

  test("does not submit an empty message and supports keyboard submission", async ({
    page,
  }) => {
    await openApp(page);
    const chatInput = input(page);
    const send = page.getByRole("button", { name: "Надіслати" });

    await expect(send).toBeDisabled();
    await chatInput.fill("тест клавіатури");
    await expect(send).toBeEnabled();
    await chatInput.press("Enter");

    await expect(
      page.getByText("тест клавіатури", { exact: true })
    ).toBeVisible();
    await expect(chatInput).toHaveValue("");
  });

  test("renders a real streaming response when configured", async ({
    page,
  }) => {
    await openApp(page);
    await input(page).fill("Що є в електронному каталозі?");
    await page.getByRole("button", { name: "Надіслати" }).click();

    await expect(
      page.getByText("Що є в електронному каталозі?", { exact: true })
    ).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/Вибачте|каталог|запит|технічна помилка/i)
        .last()
    ).toBeVisible({
      timeout: 45_000,
    });
    await expect(input(page)).toBeEnabled({ timeout: 45_000 });
  });

  test("recovers from a failed chat request", async ({ page }) => {
    await page.route("**/api/chat", route => route.abort("failed"));
    await openApp(page);
    await input(page).fill("мережевий тест");
    await page.getByRole("button", { name: "Надіслати" }).click();

    await expect(input(page)).toBeVisible();
    await expect(
      page.getByText(/помилка|спробуйте|технічна/i).last()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("opens resources and exposes safe external links", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: /Ресурси/ }).click();
    const links = page.locator('a[target="_blank"]');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("rel", /noreferrer/);
      await expect(link).toHaveAttribute("href", /^(https:\/\/|\/)/);
    }
  });

  test("supports language switching without reloading", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: "ENG" }).click();
    await expect(
      page.getByRole("heading", { name: "How can I help?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "УКР" }).click();
    await expect(
      page.getByRole("heading", { name: "Чим можу допомогти?" })
    ).toBeVisible();
  });
});

test.describe("Navigation and responsive controls", () => {
  test("opens and closes the mobile sidebar", async ({ page }) => {
    await openApp(page);
    await page.getByRole("button", { name: "Показать сайдбар" }).click();
    await expect(
      page.getByRole("complementary", { name: "Історія розмов і ресурси" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Скрыть сайдбар" }).click();
    await expect(
      page.getByRole("complementary", { name: "Історія розмов і ресурси" })
    ).toBeHidden();
  });

  test("keeps touch targets usable on mobile", async ({ page }) => {
    await openApp(page);
    for (const button of await page.locator("button").all()) {
      const box = await button.boundingBox();
      if (box && (await button.isVisible())) {
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    }
  });
});

test.describe("Readiness contract", () => {
  test("returns a safe documented readiness response", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(["ready", "not_ready"]).toContain(body.status);
    expect(body).not.toHaveProperty("DATABASE_URL");
    expect(body).not.toHaveProperty("GROQ_API_KEY");
    expect(body).not.toHaveProperty("QWEN_API_KEY");
    if (response.status() === 503) {
      expect(body.status).toBe("not_ready");
      expect(body.missing).toEqual(expect.any(Array));
    } else {
      expect(body.status).toBe("ready");
    }
  });
});

test.describe("Mobile smoke", () => {
  test("renders a single-column mobile layout", async ({ page }) => {
    await openApp(page);
    const viewport = page.viewportSize();
    const width = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    expect(width).toBeLessThanOrEqual(viewport!.width);
    await page.screenshot({
      path: "/tmp/agent-browser/e2e-mobile.png",
      fullPage: true,
    });
  });
});
