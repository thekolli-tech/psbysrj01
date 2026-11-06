import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  initDatabase,
  getSqliteDb,
  findUserByEmail,
  createUser
} from '../src/server/db.ts';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4197;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  process.env.DB_ENGINE = 'sqlite';
  initDatabase();
  const db = getSqliteDb();

  let admin = await findUserByEmail('admin@propertystudio.in');
  if (!admin) {
    admin = await createUser({
      name: 'Platform Super Administrator',
      email: 'admin@propertystudio.in',
      phone: '+919876543210',
      role: 'SUPER_ADMIN',
      password: 'AdminPassword123!'
    });
  }

  // Start preview server
  console.log(`Starting preview server on port ${PORT}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) }
  });

  server.stdout?.on('data', d => console.log('[Server stdout]:', d.toString().trim()));
  server.stderr?.on('data', d => console.error('[Server stderr]:', d.toString().trim()));

  await sleep(2500);

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Dismiss cinematic intro and set auth user on document creation
  await page.evaluateOnNewDocument((adminUser) => {
    sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
    localStorage.setItem('ps_auth_user', JSON.stringify({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'SUPER_ADMIN',
      token: 'mock-session-token'
    }));
    sessionStorage.setItem('ps_auth_user', JSON.stringify({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'SUPER_ADMIN',
      token: 'mock-session-token'
    }));
  }, admin);

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
  await sleep(800);

  // Clean any remaining intro element
  await page.evaluate(() => {
    const intros = document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]');
    intros.forEach(el => {
      if (el.textContent?.includes('Skip') || el.textContent?.includes('Intro') || el.textContent?.includes('Property Studio')) {
        el.remove();
      }
    });
  });
  await sleep(500);

  // 1. Capture Universal Search button in Navigation Bar
  console.log('Capturing navigation bar with Universal Search button...');
  const navBar = await page.$('header');
  if (navBar) {
    await navBar.screenshot({
      path: path.join(ARTIFACT_DIR, 'universal-search-navbar.png')
    });
    console.log('Saved universal-search-navbar.png');
  }

  // 2. Open Universal Search Modal
  console.log('Opening Universal Search Modal...');
  const searchBtn = await page.$('button[title="Universal Search (Ctrl+K)"]');
  if (searchBtn) {
    await searchBtn.click();
    await sleep(600);
    // Type query "Kokapet"
    await page.type('input[placeholder*="Search properties, communities"]', 'Kokapet');
    await sleep(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'universal-search-modal-open.png'),
      fullPage: false
    });
    console.log('Saved universal-search-modal-open.png');

    // Close modal via ESC key
    await page.keyboard.press('Escape');
    await sleep(400);
  }

  // 3. Navigate to Community Q&A
  console.log('Navigating to Community Q&A...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('nav button'));
    const commBtn = btns.find(b => b.textContent?.includes('Community'));
    if (commBtn) (commBtn as HTMLElement).click();
  });
  await sleep(1500);

  // Capture Community Hero with Search Community bar
  console.log('Capturing Community Hero with Search Community input...');
  const heroInput = await page.$('#hero-search-community');
  if (heroInput) {
    // capture default first
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'community-search-hero-default.png'), fullPage: false });
  await heroInput.type('Zenon');
    await sleep(600);
  }

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'community-search-hero.png'),
    fullPage: false
  });
  console.log('Saved community-search-hero.png');

  await browser.close();
  server.kill('SIGTERM');
  console.log('All verification captures completed successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
