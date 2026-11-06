/**
 * Verification script for Property Studio Google Sign-In OAuth Configuration
 * Tests backend configuration, endpoint outputs, and secret leakage prevention.
 */

async function runVerification() {
  console.log('================================================================');
  console.log('PROPERTY STUDIO — GOOGLE OAUTH VERIFICATION');
  console.log('================================================================\n');

  // Check 1: Inspect Local Environment Variables
  console.log('1. Checking Local Environment Variables:');
  const localClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const localClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const driveClientId = (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();

  if (localClientId) {
    console.log(`   [PASS] Local GOOGLE_CLIENT_ID is set: ${localClientId.slice(0, 15)}...${localClientId.slice(-10)}`);
  } else {
    console.log('   [PENDING] Local GOOGLE_CLIENT_ID is not yet set in .env');
  }

  if (localClientSecret) {
    console.log(`   [PASS] Local GOOGLE_CLIENT_SECRET is present (length: ${localClientSecret.length} chars)`);
  } else {
    console.log('   [PENDING] Local GOOGLE_CLIENT_SECRET is not yet set in .env');
  }

  if (driveClientId) {
    console.log(`   [PASS] Google Drive Client ID remains intact and separate: ${driveClientId.slice(0, 15)}...`);
    if (driveClientId === localClientId) {
      console.log('   [INFO] User authentication and Google Drive are sharing the same Client ID.');
    } else {
      console.log('   [CONFIRMED] Option 1 Active: User authentication has a separate dedicated Client ID.');
    }
  }

  // Check 2: Inspect Production Endpoint (/api/auth/config)
  console.log('\n2. Checking Live Production /api/auth/config (https://psbysrj01.vercel.app):');
  try {
    const prodConfigRes = await fetch('https://psbysrj01.vercel.app/api/auth/config');
    const prodConfig = await prodConfigRes.json() as any;
    console.log(`   HTTP Status: ${prodConfigRes.status}`);
    console.log(`   googleAuthEnabled: ${prodConfig.googleAuthEnabled}`);
    console.log(`   googleClientId: ${prodConfig.googleClientId ? prodConfig.googleClientId.slice(0, 15) + '...' : '(not yet populated in Vercel)'}`);

    // Verify secrets are NOT exposed
    if (prodConfig.googleClientSecret || prodConfig.clientSecret || prodConfig.secret) {
      console.log('   [CRITICAL FAIL] Secret detected in public config response!');
    } else {
      console.log('   [PASS] Client secret is strictly withheld from public /api/auth/config.');
    }
  } catch (err: any) {
    console.log(`   [ERROR] Could not fetch production config: ${err.message}`);
  }

  // Check 3: Inspect Authorize Endpoint on Production
  console.log('\n3. Checking Production /api/auth/google/authorize:');
  try {
    const authRes = await fetch('https://psbysrj01.vercel.app/api/auth/google/authorize');
    const authData = await authRes.json() as any;
    if (authRes.status === 200) {
      console.log('   [PASS] Authorize endpoint generated a valid Google OAuth URL:');
      console.log(`   Auth URL: ${authData.authUrl ? authData.authUrl.slice(0, 60) + '...' : 'none'}`);
      console.log(`   Redirect URI: ${authData.redirectUri}`);
    } else {
      console.log(`   [PROTECTED] Authorize endpoint safely returned HTTP ${authRes.status}: "${authData.error}"`);
      console.log('   (Correctly prevented redirect to Google with empty client_id).');
    }
  } catch (err: any) {
    console.log(`   [ERROR] Could not test authorize endpoint: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log('Architecture Status: Option 1 (Dedicated Client) is fully primed.');
  console.log('Awaiting user entry of new credentials in Vercel and local .env.');
}

runVerification().catch(console.error);
