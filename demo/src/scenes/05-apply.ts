import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, apiCall, type DemoState } from '../helpers.js';

export async function sceneApply(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234562');

  const taskId = state.newTaskId || 1;
  await page.goto(`${APP_URL}/tasks/${taskId}`, { waitUntil: 'load', timeout: 15000 });
  await wait(2500);

  // Scroll to see the task
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await wait(1000);

  // Click Apply button
  const applyBtn = page.getByRole('button', { name: /apply/i }).or(page.getByRole('link', { name: /apply/i }));
  if (await applyBtn.first().isVisible().catch(() => false)) {
    await applyBtn.first().click();
    await wait(2000);
  } else {
    // Direct navigation fallback
    await page.goto(`${APP_URL}/tasks/${taskId}/apply`, { waitUntil: 'load', timeout: 15000 });
    await wait(1500);
  }

  // Fill message
  const messageInput = page.getByRole('textbox', { name: /message/i }).or(page.locator('textarea').first());
  if (await messageInput.isVisible().catch(() => false)) {
    await messageInput.fill('Mình có thể đến ngay chiều hôm nay. Có kinh nghiệm dọn phòng KTX.');
    await wait(500);
  }

  // Submit application
  const submitBtn = page.getByRole('button', { name: /submit|apply|gửi|ứng tuyển/i });
  if (await submitBtn.first().isVisible().catch(() => false)) {
    await submitBtn.first().click();
    await wait(3000);
  }

  // Capture application ID via API
  const res = await apiCall('GET', `/tasks/${taskId}/applications`, state.user2Token);
  if (res.data?.length > 0) {
    state.applicationId = res.data[0].id;
    console.log(`    Application ID: ${state.applicationId}`);
  } else if (res.data?.data?.length > 0) {
    state.applicationId = res.data.data[0].id;
    console.log(`    Application ID: ${state.applicationId}`);
  }

  await wait(1000);
}
