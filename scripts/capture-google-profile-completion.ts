import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4208;

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

  // 1. Desktop Capture (1440 x 900)
  console.log('Capturing Desktop resolution (1440x900)...');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await desktopPage.evaluateOnNewDocument(() => {
    sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
    localStorage.removeItem('ps_auth_user');
    sessionStorage.removeItem('ps_auth_user');
  });

  await desktopPage.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
  await sleep(600);

  // Clean any intro
  await desktopPage.evaluate(() => {
    const intros = document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]');
    intros.forEach(el => el.remove());
  });
  await sleep(300);

  // Open Login Modal
  await desktopPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.textContent?.includes('Login'));
    if (loginBtn) loginBtn.click();
  });
  await sleep(500);

  // Trigger Google Auth Success message for a new user with incomplete profile
  await desktopPage.evaluate(() => {
    window.postMessage({
      type: 'GOOGLE_AUTH_SUCCESS',
      user: {
        id: 'google-usr-991',
        name: 'Swamy Reddy Javidi',
        email: 'swamy.javidi.google@gmail.com',
        role: 'PROPERTY_SEEKER'
      },
      isNewUser: true,
      isProfileComplete: false,
      googlePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }, window.location.origin);
  });
  await sleep(1000);

  const desktopPath = path.join(ARTIFACT_DIR, 'google-profile-completion-desktop.png');
  await desktopPage.screenshot({
    path: desktopPath,
    fullPage: false
  });
  console.log(`Saved Desktop screenshot to ${desktopPath}`);

  // Scroll down to showcase Section 6: Avatar selection and Section 7: Operating territory
  await desktopPage.evaluate(() => {
    const avatarHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Avatar'));
    if (avatarHeading) {
      avatarHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      const form = document.querySelector('form');
      if (form) form.scrollTop = 800;
    }
  });
  await sleep(600);

  const desktopAvatarPath = path.join(ARTIFACT_DIR, 'google-profile-completion-desktop-avatar.png');
  await desktopPage.screenshot({
    path: desktopAvatarPath,
    fullPage: false
  });
  console.log(`Saved Desktop Avatar screenshot to ${desktopAvatarPath}`);
  await desktopPage.close();

  // 2. Mobile Capture (390 x 844 iPhone 14 style)
  console.log('Capturing Mobile resolution (390x844)...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  await mobilePage.evaluateOnNewDocument(() => {
    sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
    localStorage.removeItem('ps_auth_user');
    sessionStorage.removeItem('ps_auth_user');
  });

  await mobilePage.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle2' });
  await sleep(600);

  // Clean any intro
  await mobilePage.evaluate(() => {
    const intros = document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]');
    intros.forEach(el => el.remove());
  });
  await sleep(300);

  // Open Login Modal on mobile
  await mobilePage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.textContent?.includes('Login'));
    if (loginBtn) {
      loginBtn.click();
    } else {
      // Look in mobile drawer if needed
      const menuBtn = document.querySelector('button[aria-label="Open mobile menu"]');
      if (menuBtn) (menuBtn as HTMLElement).click();
    }
  });
  await sleep(500);

  // Trigger Google Auth Success message on mobile
  await mobilePage.evaluate(() => {
    window.postMessage({
      type: 'GOOGLE_AUTH_SUCCESS',
      user: {
        id: 'google-usr-992',
        name: 'Swamy Reddy Javidi',
        email: 'swamy.javidi.google@gmail.com',
        role: 'PROPERTY_SEEKER'
      },
      isNewUser: true,
      isProfileComplete: false,
      googlePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }, window.location.origin);
  });
  await sleep(1000);

  const mobilePath = path.join(ARTIFACT_DIR, 'google-profile-completion-mobile.png');
  await mobilePage.screenshot({
    path: mobilePath,
    fullPage: false
  });
  console.log(`Saved Mobile screenshot to ${mobilePath}`);

  // Also capture mobile scrolled down to Avatar & Territory
  await mobilePage.evaluate(() => {
    const avatarHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent?.includes('Avatar'));
    if (avatarHeading) {
      avatarHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await sleep(600);

  const mobileAvatarPath = path.join(ARTIFACT_DIR, 'google-profile-completion-mobile-avatar.png');
  await mobilePage.screenshot({
    path: mobileAvatarPath,
    fullPage: false
  });
  console.log(`Saved Mobile Avatar screenshot to ${mobileAvatarPath}`);
  await mobilePage.close();

  await browser.close();
  server.kill('SIGTERM');
  console.log('All captures completed successfully!');
}

run().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
