const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;
const token = env.GUPSHUP_CUSTOMER_APP_TOKEN;
const secret = env.GUPSHUP_ACCOUNT_SECRET;

async function check(name, url, headers) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log(`[${res.status}] ${name} ->`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${name} ->`, e.message);
  }
}

async function run() {
  await check('partner Bearer token', `https://partner.gupshup.io/partner/app/${appId}`, {
    'Authorization': `Bearer ${token}`
  });
  await check('partner Bearer secret', `https://partner.gupshup.io/partner/app/${appId}`, {
    'Authorization': `Bearer ${secret}`
  });
  await check('partner token header', `https://partner.gupshup.io/partner/app/${appId}`, {
    'token': token
  });
  await check('partner token secret', `https://partner.gupshup.io/partner/app/${appId}`, {
    'token': secret
  });
  await check('api.gupshup.io Bearer token', `https://api.gupshup.io/wa/app/${appId}`, {
    'Authorization': `Bearer ${token}`
  });
  await check('api.gupshup.io apikey', `https://api.gupshup.io/wa/app/${appId}`, {
    'apikey': apiKey
  });
}

run();
