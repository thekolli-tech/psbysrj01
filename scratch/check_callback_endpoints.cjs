const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;
const token = env.GUPSHUP_CUSTOMER_APP_TOKEN;

async function check(url, method = 'GET', body = null, headers = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'apikey': apiKey,
        ...(token ? { 'token': token } : {}),
        ...headers
      },
      ...(body ? { body } : {})
    });
    const text = await res.text();
    console.log(`[${res.status}] ${method} ${url}:`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  console.log('Checking Gupshup callback / webhook config...');
  await check(`https://api.gupshup.io/wa/app/${appId}/callback`);
  await check(`https://api.gupshup.io/wa/app/${appId}/webhook`);
  await check(`https://api.gupshup.io/wa/api/v1/app/${appId}/callback`);
  await check(`https://api.gupshup.io/wa/api/v1/callback`);
  await check(`https://api.gupshup.io/sm/api/v1/callback`);
  await check(`https://partner.gupshup.io/partner/app/${appId}/callback`);
  await check(`https://partner.gupshup.io/partner/app/${appId}/callbackUrl`);
  await check(`https://partner.gupshup.io/partner/app/${appId}/webhook`);
}

run();
