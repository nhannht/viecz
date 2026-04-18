import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, smoothScroll, wait } from '../helpers.js';

export async function sceneLanding(ctx: BrowserContext, page: Page) {
  // Don't wait for all assets (3D whale model takes forever)
  // Use 'commit' to avoid waiting for 3D assets
  await page.goto(`${APP_URL}/landing`, { waitUntil: 'commit', timeout: 10000 });
  await wait(4000); // Let visible content render
  await smoothScroll(page, 4000);
  await wait(1000);
}
