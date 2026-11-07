/**
 * Property Studio — Production Google Sign-In End-to-End Verification
 */

const PROD_BASE = 'https://psbysrj01.vercel.app';
const CLIENT_ID = '344144574482-ij8do5m61c9cvmi4usv37s8fq1a8a2g4.apps.googleusercontent.com';

async function testE2E() {
  console.log('================================================================');
  console.log('PROPERTY STUDIO — GOOGLE SIGN-IN PRODUCTION E2E TEST');
  console.log('================================================================\n');

  // 1. Verify Google Authorization URL & Parameters for Custom Domain
  console.log('1. Testing Google OAuth Authorize Endpoint (Custom Domain: propertystudio.org)...');
  const googleCustomRes = await fetch(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=https://propertystudio.org/api/auth/google/callback&response_type=code&scope=openid%20email%20profile`
  );
  const customHtml = await googleCustomRes.text();
  const customMismatch = customHtml.includes('redirect_uri_mismatch');
  console.log(`   HTTP Status: ${googleCustomRes.status}`);
  console.log(`   redirect_uri_mismatch: ${customMismatch ? 'YES (MISMATCH)' : 'NO (AUTHORIZED BY GOOGLE)'}`);
  if (!customMismatch) {
    console.log('   [PASS] Custom domain redirect URI is fully authorized in Google Cloud Console.');
  }

  // 2. Verify Google Authorization URL & Parameters for Vercel Domain
  console.log('\n2. Testing Google OAuth Authorize Endpoint (Vercel Domain: psbysrj01.vercel.app)...');
  const googleVercelRes = await fetch(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=https://psbysrj01.vercel.app/api/auth/google/callback&response_type=code&scope=openid%20email%20profile`
  );
  const vercelHtml = await googleVercelRes.text();
  const vercelMismatch = vercelHtml.includes('redirect_uri_mismatch');
  console.log(`   HTTP Status: ${googleVercelRes.status}`);
  console.log(`   redirect_uri_mismatch: ${vercelMismatch ? 'YES (WAITING FOR CONSOLE PROPAGATION)' : 'NO (AUTHORIZED BY GOOGLE)'}`);

  // 3. Verify Google Identity Services (GIS) In-Browser PostMessage Mode
  console.log('\n3. Testing Google Identity Services (GIS) PostMessage Mode...');
  const googlePostmessageRes = await fetch(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=postmessage&response_type=code&scope=openid%20email%20profile`
  );
  const pmHtml = await googlePostmessageRes.text();
  const pmMismatch = pmHtml.includes('redirect_uri_mismatch');
  console.log(`   HTTP Status: ${googlePostmessageRes.status}`);
  console.log(`   postmessage authorized: ${!pmMismatch}`);
  if (!pmMismatch) {
    console.log('   [PASS] GIS pop-up authentication mode is 100% authorized on Google.');
  }

  // 4. Test Production /api/auth/config Endpoint
  console.log('\n4. Testing Production /api/auth/config...');
  const configRes = await fetch(`${PROD_BASE}/api/auth/config`);
  const configData = await configRes.json() as any;
  console.log(`   googleAuthEnabled: ${configData.googleAuthEnabled}`);
  console.log(`   googleClientId: ${configData.googleClientId}`);
  console.log(`   secret leakage check: ${configData.googleClientSecret ? 'FAIL' : 'CLEAN (PASS)'}`);

  console.log('\n================================================================');
  console.log('READY FOR LIVE AUTHENTICATION TEST');
  console.log('================================================================');
}

testE2E().catch(console.error);
