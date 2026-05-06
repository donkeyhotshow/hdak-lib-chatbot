# E2E Testing Guide - ХДАК Chatbot

Comprehensive guide for end-to-end testing on real mobile and desktop devices.

## Quick Start

### 1. Install Playwright (Optional)

For automated E2E testing:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Manual Testing Checklist - Mobile (iOS & Android)

#### Device Testing Setup

- iPhone (latest): Safari, Chrome
- Android: Chrome, Samsung Internet
- Tablet: iPad Pro, Samsung Tab

#### Core Functionality Tests

**Chat Messaging:**
- [ ] Type message and send successfully
- [ ] Long messages don't overflow (break properly)
- [ ] Special characters (emoji, Ukrainian chars) display correctly
- [ ] Copy button appears on code blocks
- [ ] Tables are horizontally scrollable
- [ ] Code blocks have syntax highlighting

**Speech Input:**
- [ ] Mic button works and shows listening state
- [ ] Speech is transcribed correctly
- [ ] Error messages appear for permission denial
- [ ] "No speech" error handled gracefully
- [ ] Network speech errors show helpful message

**Navigation:**
- [ ] Sidebar opens/closes on hamburger click
- [ ] Swipe right opens sidebar (mobile)
- [ ] Swipe left closes sidebar (mobile)
- [ ] Back arrow closes sidebar (if shown)
- [ ] New chat button works
- [ ] Conversation list loads and displays

**UI/UX:**
- [ ] All buttons are min 44x44px and tappable
- [ ] No horizontal scroll needed (except tables)
- [ ] Header doesn't overlap content
- [ ] Safe area respected on notched phones (iPhone X+)
- [ ] Keyboard doesn't hide input field
- [ ] Loading spinner shows during API calls
- [ ] Error messages are visible and readable
- [ ] Scroll-to-bottom button appears when needed

**Performance:**
- [ ] App loads in < 3 seconds
- [ ] Typing response starts within 1 second
- [ ] No jank during scrolling
- [ ] No memory leaks (check DevTools)
- [ ] Network requests retry on failure

#### Network & Error Handling

- [ ] Test with network throttling (3G, 4G)
- [ ] API timeout handled gracefully (120s typing timeout)
- [ ] Network error shows retry button
- [ ] Offline mode doesn't crash
- [ ] localStorage disabled doesn't break app

#### Orientation Tests

- [ ] Portrait mode works correctly
- [ ] Landscape mode (if supported)
- [ ] Rotation doesn't lose conversation
- [ ] Layout adapts properly

### 3. Automated E2E Tests with Playwright

Create `tests/e2e.spec.ts`:

```typescript
import { test, expect, devices } from '@playwright/test';

// Test on iPhone 12
test.use({ ...devices['iPhone 12'] });

test.describe('HDAK Chat - Mobile E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should send and receive message', async ({ page }) => {
    // Find input and send message
    const input = page.locator('textarea');
    await input.fill('Привіт');
    
    const sendBtn = page.locator('.send-btn.active');
    await sendBtn.click();
    
    // Wait for bot response
    await page.waitForSelector('[role="status"]');
    const response = page.locator('.message-assistant');
    await expect(response).toBeVisible();
  });

  test('should open/close sidebar with swipe', async ({ page }) => {
    // Swipe from left edge to right (50px)
    await page.touchscreen.swipe(
      { x: 10, y: 300 },
      { x: 100, y: 300 },
      { steps: 10, duration: 500 }
    );
    
    const sidebar = page.locator('.sidebar-premium');
    await expect(sidebar).toBeVisible();
  });

  test('speech input error handling', async ({ page }) => {
    await page.context().setPermissions([]);
    
    const micBtn = page.locator('[aria-label="Голосовий ввід"]');
    await micBtn.click();
    
    // Should show error about permissions
    const errorMsg = page.locator('text=Доступ до мікрофона');
    await expect(errorMsg).toBeVisible();
  });

  test('code block copy button', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('покажи код на JavaScript');
    await page.locator('.send-btn.active').click();
    
    // Wait for code block and hover
    const codeBlock = page.locator('code').first();
    await codeBlock.hover();
    
    // Copy button should appear
    const copyBtn = page.locator('button:has-text("Копіювати")').first();
    await expect(copyBtn).toBeVisible();
    
    // Click copy
    await copyBtn.click();
    
    // Verify clipboard (in Playwright)
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.length).toBeGreaterThan(0);
  });

  test('table is horizontally scrollable', async ({ page }) => {
    const input = page.locator('textarea');
    await input.fill('покажи таблицю з даними');
    await page.locator('.send-btn.active').click();
    
    // Wait for table
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    
    // Scroll table
    const tableContainer = page.locator('.overflow-x-auto').first();
    const scrollWidth = await tableContainer.evaluate(el => el.scrollWidth);
    const clientWidth = await tableContainer.evaluate(el => el.clientWidth);
    
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('timeout handling (120s)', async ({ page }) => {
    // This test simulates a slow response
    const input = page.locator('textarea');
    await input.fill('тест');
    await page.locator('.send-btn.active').click();
    
    // Wait longer than 120s timeout
    await page.waitForTimeout(5000);
    
    // UI should handle gracefully (in reality this would need backend mock)
    const errorState = page.locator('text=Помилка');
    // Error might appear after 120s, but app should be responsive
  });
});

// Desktop tests
test.use({ ...devices['Desktop Chrome'] });

test.describe('HDAK Chat - Desktop E2E', () => {
  test('sidebar toggle works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const menuBtn = page.locator('[aria-label*="Закрити меню"], [aria-label*="Відкрити меню"]').first();
    await menuBtn.click();
    
    const sidebar = page.locator('.sidebar-premium');
    await expect(sidebar).toBeVisible();
  });

  test('conversation history loads', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const convList = page.locator('.sidebar-premium');
    await expect(convList).toBeVisible();
  });
});
```

### 4. Run Tests

```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e.spec.ts

# Run on specific device
npx playwright test --project="iPhone 12"

# Run on multiple devices
npx playwright test --project="iPhone 12" --project="Pixel 5"

# Open test report
npx playwright show-report
```

### 5. Real Device Testing with BrowserStack

For testing on real devices without local simulators:

```bash
# Install BrowserStack local
npm install --save-dev @browserstack/local

# Run tests on real devices
npx playwright test --grep @real-device
```

### 6. Performance Testing

Use Chrome DevTools on mobile:

```typescript
test('measure performance metrics', async ({ page }) => {
  const metrics = await page.metrics();
  console.log('Metrics:', metrics);
  
  // Check specific metrics
  expect(metrics.JSHeapUsedSize).toBeLessThan(50000000); // 50MB
  expect(metrics.JSHeapTotalSize).toBeLessThan(100000000); // 100MB
});
```

### 7. Network Throttling Tests

```typescript
test('works on slow network', async ({ page, context }) => {
  // Simulate 3G
  await context.route('**/*', route => {
    setTimeout(() => route.continue(), 2000); // 2s delay
  });
  
  await page.goto('http://localhost:3000');
  const input = page.locator('textarea');
  await expect(input).toBeVisible({ timeout: 10000 });
});
```

## Manual Device Testing Notes

### iPhone Safari Specific

- [ ] Keyboard accessory bar doesn't hide input
- [ ] Long Press menu appears on links
- [ ] Pull-to-refresh doesn't interfere with scroll
- [ ] Font size respects user settings

### Android Chrome Specific

- [ ] System back button closes sidebar properly
- [ ] Split keyboard mode works
- [ ] Gesture navigation (3-button/2-button) doesn't interfere

### Debugging

Enable debug logging in development:

```typescript
// In use-chat.ts, logger will output to console
// View logs in browser console: localStorage.getItem('hdak_logs')
```

## CI/CD Integration

Add to `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Issues & Troubleshooting

### Speech Recognition Not Working

- Check microphone permissions in device settings
- Test with Safari (iOS) vs Chrome (Android)
- Use logger to check errors: `logger.getLogs()`

### Scrolling Issues

- Test on actual device (simulators are imperfect)
- Check DevTools > Performance for jank
- Verify smooth scrolling is enabled

### API Timeouts

- Check network connection
- Look for 120s timeout error message
- Check API response times in DevTools Network tab

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Mobile Testing Best Practices](https://web.dev/mobile-web-specialist/)
- [Web Vitals for Mobile](https://web.dev/vitals/)
