import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, type DemoState } from '../helpers.js';

export async function scenePostTask(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234561');
  await page.goto(`${APP_URL}/tasks/new`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await wait(2000);

  // Use CSS selectors — the custom viecz-input wraps native inputs
  // Title input (first text input on the page)
  const inputs = page.locator('input[type="text"], input:not([type])');
  const titleInput = inputs.first();
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.fill('Cần người dọn phòng KTX ĐHKHTN');
  await wait(500);

  // Description textarea
  const descInput = page.locator('textarea').first();
  if (await descInput.isVisible().catch(() => false)) {
    await descInput.fill(
      'Cần 1 bạn giúp dọn dẹp phòng 20m2 tại KTX khu B, ĐHKHTN. Khoảng 2 tiếng, có đầy đủ dụng cụ.'
    );
    await wait(500);
  }

  // Select category
  const categorySelect = page.locator('select').first();
  if (await categorySelect.isVisible().catch(() => false)) {
    // Try Vietnamese label first, then English
    await categorySelect.selectOption({ label: 'Dọn dẹp' }).catch(() =>
      categorySelect.selectOption({ label: 'Cleaning' })
    ).catch(() =>
      categorySelect.selectOption({ index: 2 }) // Fallback to index
    );
    await wait(500);
  }

  // Price input (type=number)
  const priceInput = page.locator('input[type="number"]').first();
  if (await priceInput.isVisible().catch(() => false)) {
    await priceInput.fill('150000');
    await wait(500);
  }

  // Location input (search field)
  const locationInputs = page.locator('input[type="text"], input:not([type])');
  const locationInput = locationInputs.nth(1); // Second text input is location
  if (await locationInput.isVisible().catch(() => false)) {
    await locationInput.fill('KTX khu B, ĐHKHTN, Quận 5');
    await wait(1000);
  }

  // Deadline — click "Tomorrow 6PM"
  // Click a deadline quick-pick button (3rd button = "Tomorrow 6PM" / "Ngày mai 6PM")
  const deadlineButtons = page.locator('button').filter({ hasText: /tomorrow|ngày mai|weekend|tuần/i });
  await deadlineButtons.first().click().catch(() => {
    // Fallback: click the 3rd deadline button by index
    return page.locator('button:has-text("6PM"), button:has-text("18h")').first().click();
  }).catch(() => {});
  await wait(500);

  // Submit
  await page.locator('button').filter({ hasText: /create|tạo/i }).first().click();
  await wait(3000);

  // Extract task ID from URL
  const url = page.url();
  const match = url.match(/\/tasks\/(\d+)/);
  if (match) {
    state.newTaskId = parseInt(match[1]);
    console.log(`    Created task ID: ${state.newTaskId}`);
  }

  await wait(1000);
}
