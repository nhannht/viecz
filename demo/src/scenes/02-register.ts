import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, wait } from '../helpers.js';

export async function sceneRegister(ctx: BrowserContext, page: Page) {
  // Clear auth and go to phone login
  await page.goto(`${APP_URL}/phone`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await wait(2000);

  // Use CSS selector for the input (custom viecz-input component)
  const phoneInput = page.locator('input[type="tel"], input[type="text"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
  await phoneInput.fill('+84371234581');
  await wait(800);

  // Click Continue button
  await page.locator('button:has-text("CONTINUE"), button:has-text("Continue"), button:has-text("Tiếp tục")').first().click();
  await wait(2500);

  // Type OTP code — after clicking Continue, OTP screen appears
  // The input field changes; wait for any new input to appear
  await wait(1000);
  const codeInput = page.locator('input').first();
  await codeInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (await codeInput.isVisible().catch(() => false)) {
    await codeInput.fill('123456');
    await wait(500);
    // Click the submit/verify button — try multiple text patterns
    const verifyBtn = page.locator('button').filter({ hasText: /verify|xác|submit/i }).first()
      .or(page.locator('button[type="submit"]').first());
    await verifyBtn.click().catch(() => {
      // Last resort: press Enter
      return codeInput.press('Enter');
    });
    await wait(3000);
  }

  await page.waitForURL('**/marketplace', { timeout: 10000 }).catch(() => {});
  await wait(1500);
}
