const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;

async function check(endpoint) {
  const url = `https://api.gupshup.io/wa/app/${appId}/${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'apikey': apiKey }
    });
    const text = await res.text();
    console.log(`[${res.status}] ${endpoint}:`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${endpoint}:`, e.message);
  }
}

async function run() {
  await check('callback');
  await check('callbackUrl');
  await check('webhooks');
  await check('config');
  await check('settings');
  await check('url');
  await check('users');
  await check('health');
}

run();
