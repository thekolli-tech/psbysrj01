const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;
const appName = 'propertystudio';

async function check(url, method = 'GET', headers = {}, body = null) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'apikey': apiKey, ...headers },
      ...(body ? { body } : {})
    });
    const text = await res.text();
    console.log(`[${res.status}] ${method} ${url}:`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  console.log('Checking Gupshup webhook / callback info...');
  // Check endpoints that might return the callback URL
  await check(`https://api.gupshup.io/wa/api/v1/app/${appName}/callback`);
  await check(`https://api.gupshup.io/sm/api/v1/app/${appName}/callback`);
  await check(`https://api.gupshup.io/wa/app/${appId}/project`);
  await check(`https://api.gupshup.io/wa/app/${appId}/live`);
  await check(`https://api.gupshup.io/wa/app/${appId}/webhook`);
}

run();
