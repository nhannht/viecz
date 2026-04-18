import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, type DemoState } from '../helpers.js';

export async function sceneWallet(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234561');
  await page.goto(`${APP_URL}/wallet`, { waitUntil: 'load', timeout: 15000 });
  await wait(2500);

  // Show wallet balance
  await wait(1000);

  // Fill deposit amount
  const depositInput = page.getByRole('spinbutton', { name: /deposit|nạp/i }).or(page.locator('input[name="depositAmount"]'));
  if (await depositInput.isVisible().catch(() => false)) {
    await depositInput.fill('50000');
    await wait(1000);

    // Click deposit button
    const depositBtn = page.getByRole('button', { name: /deposit|nạp tiền/i });
    if (await depositBtn.first().isVisible().catch(() => false)) {
      await depositBtn.first().click();
      await wait(3000);
    }
  }

  // Should navigate to payment checkout
  await wait(2000);
}
