const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;
const token = env.GUPSHUP_CUSTOMER_APP_TOKEN;

async function check(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log(`[${res.status}] ${url}:`, text.slice(0, 400));
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  await check(`https://api.gupshup.io/wa/app/${appId}/details`, { 'apikey': apiKey });
  await check(`https://partner.gupshup.io/partner/app/${appId}/details`, { 'token': token });
  await check(`https://partner.gupshup.io/partner/app/${appId}/details`, { 'Authorization': token });
  await check(`https://partner.gupshup.io/partner/app/${appId}/details`, { 'token': apiKey });
  await check(`https://partner.gupshup.io/partner/app/${appId}/details`, { 'apikey': apiKey });
}

run();
