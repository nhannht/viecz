import { type BrowserContext, type Page } from 'playwright';
import { APP_URL, injectAuth, wait, apiCall, type DemoState } from '../helpers.js';

export async function sceneChat(ctx: BrowserContext, page: Page, state: DemoState) {
  await injectAuth(page, '+84371234561');
  await page.goto(`${APP_URL}/messages`, { waitUntil: 'load', timeout: 15000 });
  await wait(1500);

  // Open the conversation
  const convLink = page.locator('a[href*="/messages/"]').first();
  if (await convLink.isVisible().catch(() => false)) {
    await convLink.click();
    await wait(1500);
  }

  // Find conversation ID from URL
  const url = page.url();
  const match = url.match(/\/messages\/(\d+)/);
  if (match) {
    state.conversationId = parseInt(match[1]);
  }

  // User 1 sends a message via UI
  const msgInput = page.getByRole('textbox').last();
  if (await msgInput.isVisible().catch(() => false)) {
    await msgInput.fill('Cảm ơn bạn đã nhận việc! Chiều 3h bạn đến được không?');
    await wait(500);

    // Press Enter or click send
    await page.keyboard.press('Enter');
    await wait(2000);
  }

  // User 2 replies via API
  if (state.conversationId) {
    await apiCall('POST', `/conversations/${state.conversationId}/messages`, state.user2Token, {
      content: 'Dạ được ạ, em sẽ đến lúc 3h chiều!',
    });
    await wait(1500);

    await apiCall('POST', `/conversations/${state.conversationId}/messages`, state.user2Token, {
      content: 'Em cần chuẩn bị gì thêm không ạ?',
    });
    await wait(1500);
  }

  // Reload to show new messages
  await page.reload({ waitUntil: 'load' });
  await wait(2000);
}
