const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;

async function check(url, method = 'GET', body = null) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'apikey': apiKey, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      ...(body ? { body } : {})
    });
    const text = await res.text();
    console.log(`[${res.status}] ${method} ${url}:`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  await check(`https://api.gupshup.io/wa/app/${appId}/callback`);
  await check(`https://api.gupshup.io/wa/app/${appId}/webhook`);
  await check(`https://api.gupshup.io/wa/app/${appId}/settings`);
  await check(`https://api.gupshup.io/wa/api/v1/app/${appId}/callback`);
  await check(`https://api.gupshup.io/wa/api/v1/app/propertystudio/msg/callback`);
}

run();
