import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait } from '../helpers.js';

export async function sceneMarketplace(ctx: BrowserContext, page: Page) {
  await injectAuth(page, '+84371234561');
  await page.goto(`${APP_URL}/marketplace`, { waitUntil: 'load', timeout: 15000 });
  await wait(3000);

  // Click a category chip to filter
  const cleaningChip = page.getByRole('button', { name: 'Cleaning' });
  if (await cleaningChip.isVisible().catch(() => false)) {
    await cleaningChip.click();
    await wait(2000);
  }

  // Click "All" to reset
  await page.getByRole('button', { name: 'All' }).click().catch(() => {});
  await wait(1500);

  // Click on a task card
  const firstTask = page.locator('a[href*="/tasks/"]').first();
  if (await firstTask.isVisible().catch(() => false)) {
    await firstTask.click();
    await wait(2000);
    // Go back to marketplace
    await page.goBack();
    await wait(1000);
  }

  await wait(500);
}
