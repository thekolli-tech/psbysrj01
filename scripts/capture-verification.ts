import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  initDatabase,
  getSqliteDb,
  createUser,
  findUserByEmail,
  createSession,
  createAuditLog
} from '../src/server/db.ts';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\530c6b2d-a61b-4896-9d9c-e22414c7582d';
const PORT = 4195;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  process.env.DB_ENGINE = 'sqlite';
  console.log('Initializing SQLite database...');
  initDatabase();
  const db = getSqliteDb();

  // Find or create admin user
  let admin = await findUserByEmail('admin@propertystudio.in');
  if (!admin) {
    admin = await createUser({
      name: 'Platform Super Administrator',
      email: 'admin@propertystudio.in',
      phone: '+919876543210',
      role: 'SUPER_ADMIN',
      password: 'AdminPassword123!'
    });
    console.log('Created Super Admin user:', admin.id);
  } else {
    // Ensure role is SUPER_ADMIN
    db.prepare("UPDATE users SET role = 'SUPER_ADMIN', account_status = 'ACTIVE' WHERE id = ?").run(admin.id);
  }

  // Seed sample telemetry events spread across 30 days if audit_logs has few rows
  const countRow = db.prepare('SELECT count(*) as c FROM audit_logs').get() as { c: number };
  if (countRow.c < 15) {
    console.log('Seeding telemetry audit logs for activity chart...');
    const now = Date.now();
    const actions = [
      'PLATFORM_METRICS_QUERY',
      'USER_ROLE_VERIFIED',
      'COMMUNITY_POST_MODERATED',
      'LISTING_STATUS_AUDIT',
      'FINANCIAL_RECONCILIATION_RUN',
      'SECURITY_POLICY_CHECK'
    ];
    for (let i = 0; i < 30; i++) {
      const dayOffsetMs = (29 - i) * 86400000;
      const eventTime = new Date(now - dayOffsetMs).toISOString();
      const numEvents = (i % 5) + 2;
      for (let j = 0; j < numEvents; j++) {
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, target_id, target_email, details, ip_address, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
        `).run(
          `audit_seed_${i}_${j}_${Date.now()}`,
          admin.id,
          admin.email,
          'SUPER_ADMIN',
          actions[(i + j) % actions.length],
          `SYS_${i}`,
          'telemetry@propertystudio.org',
          JSON.stringify({ channel: 'qa_seed', index: i }),
          '127.0.0.1',
          eventTime
        );
      }
    }
  }

  // Create session
  const { token } = await createSession(admin.id, 'Puppeteer QA', '127.0.0.1');
  console.log('Created admin session token:', token);

  console.log(`Starting Property Studio full server on port ${PORT}...`);
  const childEnv: Record<string, string | undefined> = { ...process.env, PORT: String(PORT), DB_ENGINE: 'sqlite', NODE_ENV: 'development' };
  delete childEnv.DATABASE_URL;

  const server = spawn('node', ['dist-server/index.mjs'], {
    cwd: 'c:\\Users\\ADMIN\\Downloads\\psbysrj01',
    env: childEnv,
    stdio: 'inherit'
  });

  // Wait for server to respond
  let serverReady = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) {
        serverReady = true;
        console.log('Server is healthy and ready on port', PORT);
        break;
      }
    } catch {}
  }

  if (!serverReady) {
    throw new Error('Server failed to start within 10 seconds.');
  }

  console.log('Launching Chrome browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();

    // Dismiss cinematic intros by default
    await page.evaluateOnNewDocument(() => {
      sessionStorage.setItem('ps_cinematic_intro_seen_v1', 'true');
    });

    // Helper to dismiss intros
    const cleanIntro = async () => {
      await page.evaluate(() => {
        const intros = document.querySelectorAll('.fixed.inset-0, [data-testid="cinematic-intro"]');
        intros.forEach(el => {
          if (el.textContent?.includes('Skip') || el.textContent?.includes('Intro') || el.textContent?.includes('Property Studio')) {
            el.remove();
          }
        });
      });
      await sleep(300);
    };

    // Set cookie on domain
    await page.setCookie({
      name: 'ps_session',
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true
    });

    const safeAdminUser = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'SUPER_ADMIN',
      account_status: 'ACTIVE',
      wallet_balance: admin.wallet_balance || 0,
      is_verified: true
    };

    // Set localStorage auth
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((u) => {
      localStorage.setItem('ps_session_user', JSON.stringify(u));
      localStorage.setItem('ps_auth_user', JSON.stringify(u));
    }, safeAdminUser);

    // 1. Desktop Super Admin Dashboard — Platform Activity & Growth Chart (1440px)
    console.log('1. Capturing Super Admin Dashboard with Growth Chart (Desktop 1440px)...');
    await page.setViewport({ width: 1440, height: 1100 });
    await page.goto(`http://127.0.0.1:${PORT}/?view=admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'dashboard-desktop-growth-chart.png'),
      clip: { x: 0, y: 0, width: 1440, height: 950 }
    });
    console.log('Saved dashboard-desktop-growth-chart.png');

    // 2. Test clicking 30D selector
    console.log('2. Testing 30D selector click...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn30D = btns.find(b => b.textContent?.trim() === '30D');
      if (btn30D) btn30D.click();
    });
    await sleep(2500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'dashboard-desktop-30d-chart.png'),
      clip: { x: 0, y: 0, width: 1440, height: 950 }
    });
    console.log('Saved dashboard-desktop-30d-chart.png');

    // 3. Mobile Dashboard (390px)
    console.log('3. Capturing Super Admin Dashboard (Mobile 390px)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`http://127.0.0.1:${PORT}/?view=admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'dashboard-mobile-growth-chart.png'),
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    console.log('Saved dashboard-mobile-growth-chart.png');

    // 4. Homepage Desktop (1440px)
    console.log('4. Capturing Public Homepage (Desktop 1440px)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/?view=home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'homepage-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved homepage-desktop.png');

    // 5. Homepage Mobile (390px)
    console.log('5. Capturing Public Homepage (Mobile 390px)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`http://127.0.0.1:${PORT}/?view=home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'homepage-mobile.png'),
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    console.log('Saved homepage-mobile.png');

    // 6. Community Q&A (Desktop 1440px)
    console.log('6. Capturing Community Q&A (Desktop 1440px)...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/?view=community`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'community-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved community-desktop.png');

    // 7. Property Requirement (Desktop 1440px)
    console.log('7. Capturing Property Requirement (Desktop 1440px)...');
    await page.goto(`http://127.0.0.1:${PORT}/?view=requirement`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'requirement-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved requirement-desktop.png');

    // 8. Contact & Connect (Desktop 1440px)
    console.log('8. Capturing Contact & Connect (Desktop 1440px)...');
    await page.goto(`http://127.0.0.1:${PORT}/?view=contact`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'contact-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved contact-desktop.png');

    // Capture specific compact enquiry form element
    const formEl = await page.$('#enquiry-form-card');
    if (formEl) {
      await formEl.screenshot({ path: path.join(ARTIFACT_DIR, 'contact-enquiry-form-compact.png') });
      console.log('Saved contact-enquiry-form-compact.png');
    }

    // Scroll to bottom and capture compact footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);
    const footerEl = await page.$('footer');
    if (footerEl) {
      await footerEl.screenshot({ path: path.join(ARTIFACT_DIR, 'footer-compact.png') });
      console.log('Saved footer-compact.png');
    }

    // 9. Buyer Leads Marketplace (Desktop 1440px)
    console.log('9. Capturing Buyer Leads Marketplace (Desktop 1440px)...');
    await page.goto(`http://127.0.0.1:${PORT}/?view=leads_market`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2500);
    await cleanIntro();

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'leads-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved leads-desktop.png');

    // 10. Authentication Modal (Desktop 1440px)
    console.log('10. Capturing Authentication Modal (Desktop 1440px)...');
    await page.deleteCookie({ name: 'ps_session', domain: '127.0.0.1', path: '/' });
    await page.goto(`http://127.0.0.1:${PORT}/?view=home`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);
    await cleanIntro();

    await page.evaluate(() => {
      localStorage.removeItem('ps_session_user');
      localStorage.removeItem('ps_auth_user');
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b =>
        b.textContent?.includes('Sign In') ||
        b.textContent?.includes('Log In') ||
        b.textContent?.includes('Login') ||
        b.getAttribute('aria-label')?.includes('Sign In')
      );
      if (loginBtn) loginBtn.click();
    });
    await sleep(1200);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'auth-modal-desktop.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 }
    });
    console.log('Saved auth-modal-desktop.png');

    console.log('ALL 10 QA SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch(err => {
  console.error('QA capture error:', err);
  process.exit(1);
});
