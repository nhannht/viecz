import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, apiCall, type DemoState } from '../helpers.js';

export async function sceneAccept(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234561');

  const taskId = state.newTaskId || 1;
  await page.goto(`${APP_URL}/tasks/${taskId}`, { waitUntil: 'load', timeout: 15000 });
  await wait(2500);

  // Scroll to applications section
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await wait(1500);

  // Find and click Accept button
  const acceptBtn = page.getByRole('button', { name: /accept|chấp nhận/i });
  if (await acceptBtn.first().isVisible().catch(() => false)) {
    await acceptBtn.first().click();
    await wait(2000);
  } else if (state.applicationId) {
    // Fallback: accept via API
    await apiCall('POST', `/applications/${state.applicationId}/accept`, state.user1Token);
    await wait(1000);
    await page.reload({ waitUntil: 'load' });
    await wait(1500);
  }

  // Navigate to messages
  await page.goto(`${APP_URL}/messages`, { waitUntil: 'load', timeout: 15000 });
  await wait(2000);

  // Click first conversation
  const convLink = page.locator('a[href*="/messages/"]').first().or(page.locator('button').filter({ hasText: /dọn phòng|task/i }).first());
  if (await convLink.isVisible().catch(() => false)) {
    await convLink.click();
    await wait(2000);
  }

  await wait(500);
}
