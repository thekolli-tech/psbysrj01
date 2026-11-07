import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4222;

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
    // 1. Desktop Authenticated Shell with Real Data
    console.log('Capturing Desktop Authenticated Shell (1440x900)...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    await page.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_mock_user', JSON.stringify(user));
      localStorage.setItem('ps_mock_logged_in', 'true');
      const realFetch = window.fetch;
      window.fetch = async (url, init) => {
        const u = String(url);
        if (u.includes('/api/auth/me')) {
          return new Response(JSON.stringify({ user, authenticated: true, success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (u.includes('/api/communities')) {
          return new Response(JSON.stringify({
            communities: [
              {
                id: 'comm-kokapet',
                name: 'ps/KokapetInvestors',
                slug: 'kokapet-investors',
                description: 'Kokapet Golden Mile & Neopolis commercial absorption corridor.',
                category: 'Micro-Market Hub',
                memberCount: 890,
                status: 'APPROVED',
                visibility: 'PUBLIC',
                membershipStatus: 'ACTIVE'
              },
              {
                id: 'comm-tellapur',
                name: 'ps/TellapurVillas',
                slug: 'tellapur-villas',
                description: 'Tellapur gated communities, independent villas and luxury developments.',
                category: 'Micro-Market Hub',
                memberCount: 420,
                status: 'APPROVED',
                visibility: 'PUBLIC',
                membershipStatus: 'NONE'
              }
            ]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (u.includes('/api/community/posts')) {
          return new Response(JSON.stringify({
            posts: [
              {
                id: 'post-1',
                title: 'Kokapet Neopolis 100ft Link Road & Trumpet Flyover: Ground Inspection November 2026',
                content: 'Direct field inspection summary for Western Corridor buyers:\n\n- The trumpet interchange connecting Kokapet SEZ directly to the Outer Ring Road (ORR) is at 85% physical completion.\n- 36-meter master plan link roads connecting Financial District to Golden Mile have base asphalt completed.\n- Stormwater trunk conduits and underground electrical ducts are being commissioned ahead of commercial IT tower occupancy targeted for late 2027.',
                topic: 'Construction Updates',
                communityName: 'ps/KokapetInvestors',
                communityId: 'comm-kokapet',
                authorName: 'Swamy Reddy Javidi',
                authorRole: 'PROPERTY_SEEKER',
                authorProfession: 'HNI Real Estate Investor',
                upvotes: 42,
                commentsCount: 15,
                mediaType: 'VIDEO',
                mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: 'APPROVED',
                createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
              },
              {
                id: 'post-2',
                title: 'Tellapur Luxury Gated Villa Communities vs Kokapet High-Rise: 10-Year Horizon Analysis',
                content: 'Comparing long-term appreciation differential between independent duplex villas in Tellapur vs ultra-luxury 50-floor sky residences in Neopolis.',
                topic: 'Luxury Villas & Communities',
                communityName: 'ps/TellapurVillas',
                communityId: 'comm-tellapur',
                authorName: 'Dr. Rajeshwar Rao',
                authorRole: 'PROPERTY_SEEKER',
                upvotes: 28,
                commentsCount: 9,
                mediaType: 'POST',
                links: [{ url: 'https://rera.telangana.gov.in', title: 'TG RERA Official Portal' }],
                status: 'APPROVED',
                createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
              }
            ]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return realFetch(url, init);
      };
    }, mockUser);

    await page.goto(`http://localhost:${PORT}?view=home`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const desktopFeedPath = path.join(ARTIFACT_DIR, 'authenticated-reddit-shell-desktop.png');
    await page.screenshot({ path: desktopFeedPath, fullPage: false });
    console.log(`Saved: ${desktopFeedPath}`);

    // 2. Open Post Composer showing Reddit Tabs & Media
    console.log('Opening Post Composer (Reddit style)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find(b => b.textContent?.includes('Create') || b.textContent?.includes('Start a discussion'));
      if (createBtn) createBtn.click();
    });
    await sleep(1000);

    const composerPath = path.join(ARTIFACT_DIR, 'reddit-style-composer-modal.png');
    await page.screenshot({ path: composerPath, fullPage: false });
    console.log(`Saved: ${composerPath}`);

    // Click Video tab inside composer and inspect Super Admin video lock
    console.log('Switching to Video tab in composer...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const videoTab = btns.find(b => b.textContent?.trim() === 'Video');
      if (videoTab) videoTab.click();
    });
    await sleep(500);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const uploadSubTab = btns.find(b => b.textContent?.includes('Upload Video File'));
      if (uploadSubTab) uploadSubTab.click();
    });
    await sleep(500);

    const videoLockPath = path.join(ARTIFACT_DIR, 'reddit-composer-video-lock.png');
    await page.screenshot({ path: videoLockPath, fullPage: false });
    console.log(`Saved: ${videoLockPath}`);

    // Close modal
    await page.evaluate(() => {
      const closeBtns = Array.from(document.querySelectorAll('button'));
      const closeBtn = closeBtns.find(b => b.querySelector('svg.lucide-x'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);

    // 3. Navigate to Live Sessions (Conference) — PROVE it stays inside the authenticated shell!
    console.log('Navigating to Live Sessions (CONFERENCE)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const liveBtn = btns.find(b => b.textContent?.includes('Live Sessions'));
      if (liveBtn) liveBtn.click();
    });
    await sleep(1500);

    const conferenceInShellPath = path.join(ARTIFACT_DIR, 'conference-inside-authenticated-shell.png');
    await page.screenshot({ path: conferenceInShellPath, fullPage: false });
    console.log(`Saved: ${conferenceInShellPath}`);

    // 4. Mobile Viewport (390x844)
    console.log('Capturing Mobile Viewport (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await mobilePage.evaluateOnNewDocument((user) => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
      localStorage.setItem('ps_mock_user', JSON.stringify(user));
      localStorage.setItem('ps_mock_logged_in', 'true');
      const realFetch = window.fetch;
      window.fetch = async (url, init) => {
        const u = String(url);
        if (u.includes('/api/auth/me')) {
          return new Response(JSON.stringify({ user, authenticated: true, success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (u.includes('/api/communities')) {
          return new Response(JSON.stringify({ communities: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (u.includes('/api/community/posts')) {
          return new Response(JSON.stringify({ posts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return realFetch(url, init);
      };
    }, mockUser);

    await mobilePage.goto(`http://localhost:${PORT}?view=home`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const mobilePath = path.join(ARTIFACT_DIR, 'authenticated-shell-mobile.png');
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved: ${mobilePath}`);

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
    server.kill();
    console.log('Capture completed.');
  }
}

run();
