import { type Browser, type BrowserContext, type Page, chromium } from 'playwright';
import { mkdirSync, renameSync, readdirSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:9999/api/v1';
const APP_URL = 'http://100.64.0.2:4200';

export interface DemoState {
  user1Token: string;
  user2Token: string;
  user1Id: number;
  user2Id: number;
  newTaskId: number;
  applicationId: number;
  conversationId: number;
}

export interface SceneMeta {
  name: string;
  subtitleVi: string;
  subtitleEn: string;
  videoPath: string;
  durationMs: number;
}

// Login via API and return token + user info
export async function apiLogin(phone: string): Promise<{ token: string; refreshToken: string; userId: number; user: any }> {
  const res = await fetch(`${API_BASE}/auth/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: phone }),
  });
  if (!res.ok) throw new Error(`Login failed for ${phone}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    token: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user.id,
    user: data.user,
  };
}

// Inject auth into localStorage so Angular picks it up
export async function injectAuth(page: Page, phone: string) {
  const { token, refreshToken, user } = await apiLogin(phone);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(({ token, refreshToken, user }) => {
    localStorage.setItem('viecz_access_token', token);
    localStorage.setItem('viecz_refresh_token', refreshToken);
    localStorage.setItem('viecz_user', JSON.stringify(user));
  }, { token, refreshToken, user });
  return { token, user };
}

// API helper with auth
export async function apiCall(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// Create a recording context
export async function createRecordingContext(browser: Browser, clipDir: string): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: clipDir, size: { width: 1920, height: 1080 } },
    locale: 'vi-VN',
    geolocation: { latitude: 10.7627, longitude: 106.6822 },
    permissions: ['geolocation'],
    colorScheme: 'light',
  });
}

// Record a scene — runs fn, closes context, renames video file
export async function recordScene(
  browser: Browser,
  sceneName: string,
  subtitleVi: string,
  subtitleEn: string,
  fn: (ctx: BrowserContext, page: Page) => Promise<void>,
): Promise<SceneMeta> {
  const clipDir = resolve('output/clips');
  mkdirSync(clipDir, { recursive: true });

  const startTime = Date.now();
  const ctx = await createRecordingContext(browser, clipDir);
  const page = await ctx.newPage();

  try {
    await fn(ctx, page);
  } catch (err) {
    console.error(`Scene ${sceneName} error:`, err);
  }

  // Close page and context to finalize video
  const videoPath = await page.video()?.path();
  await page.close();
  await ctx.close();

  const durationMs = Date.now() - startTime;

  // Rename the auto-generated file
  const finalPath = resolve(clipDir, `${sceneName}.webm`);
  if (videoPath) {
    // Small delay to ensure file is fully written
    await new Promise(r => setTimeout(r, 500));
    try {
      renameSync(videoPath, finalPath);
    } catch {
      console.warn(`Could not rename ${videoPath} to ${finalPath}`);
    }
  }

  console.log(`  [${sceneName}] recorded ${(durationMs / 1000).toFixed(1)}s → ${finalPath}`);

  return {
    name: sceneName,
    subtitleVi,
    subtitleEn,
    videoPath: finalPath,
    durationMs,
  };
}

// Smooth scroll helper
export async function smoothScroll(page: Page, durationMs: number = 3000) {
  await page.evaluate(async (ms) => {
    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const steps = 60;
    const stepDelay = ms / steps;
    const stepSize = totalHeight / steps;
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, stepSize);
      await new Promise(r => setTimeout(r, stepDelay));
    }
  }, durationMs);
}

// Wait helper
export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export { APP_URL, API_BASE };
