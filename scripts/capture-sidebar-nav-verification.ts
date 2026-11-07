import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4334;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonWithText(page: any, text: string) {
  const clicked = await page.evaluate((targetText: string) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim().includes(targetText));
    if (btn) {
      btn.scrollIntoView({ block: 'center' });
      (btn as HTMLElement).click();
      return true;
    }
    return false;
  }, text);
  return clicked;
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_session_user', JSON.stringify(user));
      localStorage.setItem('ps_auth_user', JSON.stringify(user));
      document.cookie = 'ps_session=verified_mock_session_token; path=/; max-age=86400';
    }, mockUser);

    // 1. Initial Load: Home Feed
    console.log('Navigating to http://localhost:' + PORT);
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(1500);

    const initialScreenshot = path.join(ARTIFACT_DIR, 'nav-step1-home-feed.png');
    await page.screenshot({ path: initialScreenshot });
    console.log('1. Captured Home Feed:', initialScreenshot);

    // 2. Click "My Profile" in sidebar
    console.log('Clicking "My Profile" button in sidebar...');
    const clickedProfile = await clickButtonWithText(page, 'My Profile');
    if (!clickedProfile) throw new Error('Could not click "My Profile" button');
    await sleep(1500);
    const profileScreenshot = path.join(ARTIFACT_DIR, 'nav-step2-my-profile-workspace.png');
    await page.screenshot({ path: profileScreenshot });
    console.log('2. Captured My Profile Workspace (Settings active):', profileScreenshot);

    // 3. Click "My Enquiries" in sidebar
    console.log('Clicking "My Enquiries" button in sidebar...');
    const clickedEnquiries = await clickButtonWithText(page, 'My Enquiries');
    if (!clickedEnquiries) throw new Error('Could not click "My Enquiries" button');
    await sleep(1500);
    const enquiriesScreenshot = path.join(ARTIFACT_DIR, 'nav-step3-my-enquiries.png');
    await page.screenshot({ path: enquiriesScreenshot });
    console.log('3. Captured My Enquiries Workspace (Requirements active):', enquiriesScreenshot);

    // 4. Click "Discover" in sidebar
    console.log('Clicking "Discover" button in sidebar...');
    const clickedDiscover = await clickButtonWithText(page, 'Discover');
    if (!clickedDiscover) throw new Error('Could not click "Discover" button');
    await sleep(1500);
    const discoverScreenshot = path.join(ARTIFACT_DIR, 'nav-step4-discover-properties.png');
    await page.screenshot({ path: discoverScreenshot });
    console.log('4. Captured Discover Properties View:', discoverScreenshot);

    // 5. Click "Developers" in sidebar
    console.log('Clicking "Developers" button in sidebar...');
    const clickedDev = await clickButtonWithText(page, 'Developers');
    if (!clickedDev) throw new Error('Could not click "Developers" button');
    await sleep(1500);
    const devScreenshot = path.join(ARTIFACT_DIR, 'nav-step5-developers-stakeholders.png');
    await page.screenshot({ path: devScreenshot });
    console.log('5. Captured Developers / Stakeholders Directory:', devScreenshot);

    // 6. Click "Real Estate Media" in sidebar
    console.log('Clicking "Real Estate Media" button in sidebar...');
    const clickedMedia = await clickButtonWithText(page, 'Real Estate Media');
    if (!clickedMedia) throw new Error('Could not click "Real Estate Media" button');
    await sleep(1500);
    const mediaScreenshot = path.join(ARTIFACT_DIR, 'nav-step6-real-estate-media.png');
    await page.screenshot({ path: mediaScreenshot });
    console.log('6. Captured Real Estate Media View:', mediaScreenshot);

    // 7. Click "Home" in sidebar to return to feed
    console.log('Clicking "Home" button in sidebar...');
    const clickedHome = await clickButtonWithText(page, 'Home');
    if (!clickedHome) throw new Error('Could not click "Home" button');
    await sleep(1500);
    const homeScreenshot = path.join(ARTIFACT_DIR, 'nav-step7-returned-home-feed.png');
    await page.screenshot({ path: homeScreenshot });
    console.log('7. Captured Return to Home Feed:', homeScreenshot);

    console.log('ALL 7 NAVIGATION VERIFICATIONS PASSED AND SCREENSHOTS CAPTURED!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('Navigation verification failed:', err);
  process.exit(1);
});
