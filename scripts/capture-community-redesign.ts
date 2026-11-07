import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4210;

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

  const mockUser = {
    id: 'usr_hyd_seeker_01',
    name: 'Swamy Reddy Javidi',
    email: 'swamy.reddy@propertystudio.org',
    role: 'PROPERTY_SEEKER',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    townCity: 'Hyderabad, Telangana, India',
    profession: 'HNI Real Estate Investor',
    walletBalance: 2500,
    isVerified: true,
    interests: ['Kokapet & Neopolis', 'Construction Updates', 'Legal & RERA', 'Rental Yield & ROI']
  };

  try {
    // 1. Desktop Capture (1440x900)
    console.log('Capturing Desktop resolution (1440x900)...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_session_user', JSON.stringify(user));
      localStorage.setItem('ps_auth_user', JSON.stringify(user));
    }, mockUser);

    await page.goto(`http://localhost:${PORT}/?view=dashboard`, { waitUntil: 'networkidle2' });
    await sleep(800);

    // Remove intro overlays if present
    await page.evaluate(() => {
      document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]').forEach(el => {
        if (!el.getAttribute('role')?.includes('dialog')) el.remove();
      });
    });
    await sleep(400);

    const desktopPath = path.join(ARTIFACT_DIR, 'community-first-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved Desktop screenshot to ${desktopPath}`);

    // Scroll down to capture feed items
    await page.evaluate(() => window.scrollBy(0, 450));
    await sleep(400);
    const desktopScrolledPath = path.join(ARTIFACT_DIR, 'community-first-desktop-feed.png');
    await page.screenshot({ path: desktopScrolledPath, fullPage: false });
    console.log(`Saved Desktop feed scrolled screenshot to ${desktopScrolledPath}`);

    // 2. Open Composer Modal
    console.log('Capturing Post Composer modal...');
    await page.evaluate(() => {
      // Click create button
      const buttons = Array.from(document.querySelectorAll('button'));
      const createBtn = buttons.find(b => b.textContent?.includes('Create') || b.textContent?.includes('Start a discussion'));
      if (createBtn) (createBtn as HTMLElement).click();
    });
    await sleep(500);

    const composerPath = path.join(ARTIFACT_DIR, 'community-first-composer-modal.png');
    await page.screenshot({ path: composerPath, fullPage: false });
    console.log(`Saved Post Composer modal screenshot to ${composerPath}`);

    // Close composer
    await page.keyboard.press('Escape');
    await sleep(300);

    // 3. Tablet Capture (1024x768)
    console.log('Capturing Tablet resolution (1024x768)...');
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });

    await tabletPage.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_session_user', JSON.stringify(user));
      localStorage.setItem('ps_auth_user', JSON.stringify(user));
    }, mockUser);

    await tabletPage.goto(`http://localhost:${PORT}/?view=dashboard`, { waitUntil: 'networkidle2' });
    await sleep(600);
    const tabletPath = path.join(ARTIFACT_DIR, 'community-first-tablet.png');
    await tabletPage.screenshot({ path: tabletPath, fullPage: false });
    console.log(`Saved Tablet screenshot to ${tabletPath}`);

    // 4. Mobile Capture (390x844 - iPhone 14/15)
    console.log('Capturing Mobile resolution (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });

    await mobilePage.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_session_user', JSON.stringify(user));
      localStorage.setItem('ps_auth_user', JSON.stringify(user));
    }, mockUser);

    await mobilePage.goto(`http://localhost:${PORT}/?view=dashboard`, { waitUntil: 'networkidle2' });
    await sleep(600);
    const mobilePath = path.join(ARTIFACT_DIR, 'community-first-mobile.png');
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved Mobile screenshot to ${mobilePath}`);

    // Mobile scroll
    await mobilePage.evaluate(() => window.scrollBy(0, 350));
    await sleep(300);
    const mobileScrolledPath = path.join(ARTIFACT_DIR, 'community-first-mobile-feed.png');
    await mobilePage.screenshot({ path: mobileScrolledPath, fullPage: false });
    console.log(`Saved Mobile scrolled screenshot to ${mobileScrolledPath}`);

  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
    server.kill();
    console.log('Finished capturing screenshots.');
  }
}

run();
