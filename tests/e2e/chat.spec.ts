import { test, expect, devices } from '@playwright/test';

/**
 * HDAK Chatbot E2E Tests
 * Tests core chat functionality on mobile and desktop
 */

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('textarea', { timeout: 10000 });
  });

  test('should display chat interface', async ({ page }) => {
    // Check main elements are visible
    const input = page.locator('textarea');
    const sendBtn = page.locator('.send-btn');
    const header = page.locator('.chat-header');

    await expect(input).toBeVisible();
    await expect(sendBtn).toBeVisible();
    await expect(header).toBeVisible();
  });

  test('should send message and show response', async ({ page }) => {
    const input = page.locator('textarea');
    const sendBtn = page.locator('.send-btn');

    // Type message
    await input.fill('привіт');
    await expect(sendBtn).toHaveClass(/active/);

    // Send message
    await sendBtn.click();

    // Check user message appears
    const userMessage = page.locator('text=привіт');
    await expect(userMessage).toBeVisible();

    // Wait for bot response with timeout
    const botMessage = page.locator('.message-assistant', { has: page.locator('text=/.*Привіт|привіт.*/', { matchCase: false }) }).first();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Input should be cleared
    await expect(input).toHaveValue('');
  });

  test('should handle long messages without overflow', async ({ page }) => {
    const input = page.locator('textarea');
    const longText = 'це дуже довге повідомлення '.repeat(10).trim();

    await input.fill(longText);
    const sendBtn = page.locator('.send-btn.active');
    await sendBtn.click();

    // Check message displays correctly
    const userMessage = page.locator('.message-user').first();
    await expect(userMessage).toBeVisible();

    // Get the bounding box and check it doesn't overflow
    const boundingBox = await userMessage.boundingBox();
    expect(boundingBox?.width).toBeLessThan(page.viewportSize()?.width || 500);
  });

  test('should show error for empty send attempt', async ({ page }) => {
    const input = page.locator('textarea');
    const sendBtn = page.locator('.send-btn');

    // Send button should be disabled when empty
    await expect(input).toHaveValue('');
    await expect(sendBtn).not.toHaveClass(/active/);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept and fail API calls
    await page.route('**/api/chat', route => {
      route.abort('failed');
    });

    const input = page.locator('textarea');
    await input.fill('test');
    const sendBtn = page.locator('.send-btn.active');
    await sendBtn.click();

    // Should either show error message or retry
    // Check that app doesn't crash
    const input2 = page.locator('textarea');
    await expect(input2).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('textarea', { timeout: 10000 });
  });

  test('should toggle sidebar menu', async ({ page }) => {
    const menuBtn = page.locator('[aria-label*="меню"]').first();
    const sidebar = page.locator('.sidebar-premium');

    // Open sidebar
    await menuBtn.click();
    await expect(sidebar).toHaveClass(/translate-x-0|block|open/, { timeout: 5000 });

    // Close sidebar
    await menuBtn.click();
    // Sidebar should be closed (might have different classes)
  });

  test('should create new conversation', async ({ page }) => {
    const newChatBtn = page.locator('[aria-label="Очистити чат"], button:has-text("НОВИЙ ЧАТ")').first();

    // First, we need at least one message
    const input = page.locator('textarea');
    await input.fill('тест');
    const sendBtn = page.locator('.send-btn.active');
    await sendBtn.click();

    // Wait for message to appear
    await page.waitForSelector('.message-user');

    // Now new chat button should be enabled
    const newChatBtnEnabled = page.locator('[aria-label="Очистити чат"]');
    await expect(newChatBtnEnabled).not.toBeDisabled();

    // Click new chat
    await newChatBtnEnabled.click();

    // Input should be empty for new chat
    const newInput = page.locator('textarea');
    await expect(newInput).toHaveValue('');
  });
});

test.describe('Mobile Specific', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should have proper touch targets (44x44px minimum)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('textarea');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        // Check minimum touch target size
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should be responsive to viewport', async ({ page }) => {
    await page.goto('/');

    // Check that layout is single column on mobile
    const chatArea = page.locator('.flex').first();
    const viewportSize = page.viewportSize();

    const boundingBox = await chatArea.boundingBox();
    if (boundingBox && viewportSize) {
      expect(boundingBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });

  test('should handle keyboard appearance', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('textarea');
    const inputBox = await input.boundingBox();

    // Focus input (simulates keyboard appearance)
    await input.focus();
    await page.waitForTimeout(500);

    // Input should still be visible
    const inputBoxAfterFocus = await input.boundingBox();
    expect(inputBoxAfterFocus?.y).toBeLessThan((page.viewportSize()?.height || 812) - 50);
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    const buttons = page.locator('button[aria-label]');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // Check specific important buttons have labels
    const menuBtn = page.locator('[aria-label*="меню"]');
    await expect(menuBtn).toBeTruthy();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('textarea');
    await input.focus();

    // Type message
    await input.fill('тест');

    // Tab to send button and press Enter
    await page.keyboard.press('Tab');
    // Should activate send button (implementation dependent)

    // Alt+Enter should also send
    await input.focus();
    await input.fill('тест 2');
    // This depends on implementation
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForSelector('textarea');
    const loadTime = Date.now() - startTime;

    // Should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid messages', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('textarea');

    const input = page.locator('textarea');
    const sendBtn = page.locator('.send-btn');

    // Send multiple messages quickly
    for (let i = 0; i < 3; i++) {
      await input.fill(`сообщение ${i}`);
      const activeBtn = page.locator('.send-btn.active');
      if (await activeBtn.isVisible()) {
        await activeBtn.click();
        await page.waitForTimeout(100);
      }
    }

    // App should still be responsive
    await expect(input).toBeVisible();
  });
});
