import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, apiCall, type DemoState } from '../helpers.js';

export async function sceneComplete(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234561');

  const taskId = state.newTaskId || 1;
  await page.goto(`${APP_URL}/tasks/${taskId}`, { waitUntil: 'load', timeout: 15000 });
  await wait(2000);

  // Click Mark Complete
  const completeBtn = page.getByRole('button', { name: /complete|hoàn thành/i });
  if (await completeBtn.first().isVisible().catch(() => false)) {
    await completeBtn.first().click();
    await wait(2000);
  } else {
    // Fallback: complete via API
    await apiCall('POST', `/tasks/${taskId}/complete`, state.user1Token);
    await wait(1000);
    await page.reload({ waitUntil: 'load' });
    await wait(1500);
  }

  await wait(1500);
}
