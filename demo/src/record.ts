import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { apiLogin, recordScene, type DemoState, type SceneMeta } from './helpers.js';
import { sceneLanding } from './scenes/01-landing.js';
import { sceneRegister } from './scenes/02-register.js';
import { sceneMarketplace } from './scenes/03-marketplace.js';
import { scenePostTask } from './scenes/04-post-task.js';
import { sceneApply } from './scenes/05-apply.js';
import { sceneAccept } from './scenes/06-accept.js';
import { sceneChat } from './scenes/07-chat.js';
import { sceneWallet } from './scenes/08-wallet.js';
import { sceneComplete } from './scenes/09-complete.js';

async function main() {
  console.log('=== Viecz Demo Video Recording ===\n');

  // Pre-login both users to get tokens
  console.log('Pre-authenticating users...');
  const u1 = await apiLogin('+84371234561');
  const u2 = await apiLogin('+84371234562');

  const state: DemoState = {
    user1Token: u1.token,
    user2Token: u2.token,
    user1Id: u1.userId,
    user2Id: u2.userId,
    newTaskId: 0,
    applicationId: 0,
    conversationId: 0,
  };

  console.log(`  User 1: ${u1.user.name} (ID ${u1.userId})`);
  console.log(`  User 2: ${u2.user.name} (ID ${u2.userId})\n`);

  const browser = await chromium.launch({ headless: true });
  const scenes: SceneMeta[] = [];

  // Scene definitions
  const sceneList: Array<{
    name: string;
    vi: string;
    en: string;
    fn: (ctx: any, page: any) => Promise<void>;
  }> = [
    {
      name: '01-landing',
      vi: 'Viecz — Nền tảng kết nối việc vặt sinh viên',
      en: 'Viecz — Student Micro-Task Marketplace',
      fn: sceneLanding,
    },
    {
      name: '02-register',
      vi: 'Đăng ký tài khoản bằng số điện thoại',
      en: 'Register with your phone number',
      fn: sceneRegister,
    },
    {
      name: '03-marketplace',
      vi: 'Tìm kiếm việc gần bạn trên bản đồ',
      en: 'Browse tasks near you on the map',
      fn: sceneMarketplace,
    },
    {
      name: '04-post-task',
      vi: 'Đăng một việc cần làm trong 30 giây',
      en: 'Post a task in 30 seconds',
      fn: (ctx, page) => scenePostTask(ctx, page, state),
    },
    {
      name: '05-apply',
      vi: 'Người khác thấy và ứng tuyển ngay',
      en: 'Others see your task and apply instantly',
      fn: (ctx, page) => sceneApply(ctx, page, state),
    },
    {
      name: '06-accept',
      vi: 'Chấp nhận ứng viên và bắt đầu chat',
      en: 'Accept an applicant and start chatting',
      fn: (ctx, page) => sceneAccept(ctx, page, state),
    },
    {
      name: '07-chat',
      vi: 'Trò chuyện trực tiếp với người nhận việc',
      en: 'Chat in real-time with the tasker',
      fn: (ctx, page) => sceneChat(ctx, page, state),
    },
    {
      name: '08-wallet',
      vi: 'Nạp tiền vào ví qua ngân hàng Việt Nam',
      en: 'Deposit funds via Vietnamese bank transfer',
      fn: (ctx, page) => sceneWallet(ctx, page, state),
    },
    {
      name: '09-complete',
      vi: 'Hoàn thành việc — tiền được thanh toán',
      en: 'Task completed — payment released',
      fn: (ctx, page) => sceneComplete(ctx, page, state),
    },
  ];

  // Record each scene
  for (const scene of sceneList) {
    console.log(`Recording: ${scene.name}...`);
    const meta = await recordScene(browser, scene.name, scene.vi, scene.en, scene.fn);
    scenes.push(meta);
  }

  await browser.close();

  // Generate SRT subtitles
  console.log('\nGenerating subtitles...');
  const srt = generateSRT(scenes);
  writeFileSync(resolve('subtitles/subs.srt'), srt, 'utf-8');
  console.log('  → subtitles/subs.srt');

  // Generate FFmpeg concat file
  const concatList = scenes
    .map((s) => `file '${s.videoPath}'`)
    .join('\n');
  writeFileSync(resolve('output/clips.txt'), concatList, 'utf-8');
  console.log('  → output/clips.txt');

  // Print summary
  const totalMs = scenes.reduce((sum, s) => sum + s.durationMs, 0);
  console.log(`\n=== Recording Complete ===`);
  console.log(`Total duration: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Clips: ${scenes.length}`);
  console.log(`\nRun 'bash scripts/stitch.sh' to produce the final video.`);
}

function generateSRT(scenes: SceneMeta[]): string {
  let srt = '';
  let cumulativeMs = 0;

  scenes.forEach((scene, i) => {
    const startMs = cumulativeMs;
    const endMs = cumulativeMs + scene.durationMs;

    srt += `${i + 1}\n`;
    srt += `${formatTime(startMs)} --> ${formatTime(endMs)}\n`;
    srt += `${scene.subtitleVi}\n`;
    srt += `${scene.subtitleEn}\n\n`;

    cumulativeMs = endMs;
  });

  return srt;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad3(millis)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

main().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
