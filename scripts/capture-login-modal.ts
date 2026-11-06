import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4199;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log(`Starting preview server on port ${PORT}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) }
  });

  await sleep(2500);

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Dismiss cinematic intro and ensure logged out to open login modal
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
    localStorage.removeItem('ps_auth_user');
    sessionStorage.removeItem('ps_auth_user');
  });

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
  await sleep(800);

  // Clean any remaining intro
  await page.evaluate(() => {
    const intros = document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]');
    intros.forEach(el => el.remove());
  });
  await sleep(400);

  // Click Login button
  console.log('Clicking Login button to open LoginModal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.textContent?.includes('Login'));
    if (loginBtn) loginBtn.click();
  });
  await sleep(1000);

  // Capture Login Modal
  console.log('Capturing Login Modal...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'login-modal-no-linkedin-microsoft.png'),
    fullPage: false
  });
  console.log('Saved login-modal-no-linkedin-microsoft.png');

  await browser.close();
  server.kill('SIGTERM');
  console.log('Capture completed successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
