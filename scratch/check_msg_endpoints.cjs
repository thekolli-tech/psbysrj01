const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID;

async function check(url) {
  try {
    const res = await fetch(url, { headers: { 'apikey': apiKey } });
    const text = await res.text();
    console.log(`[${res.status}] ${url}:`, text.slice(0, 300));
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  console.log('Checking message status endpoints...');
  // Check Gupshup message endpoints
  await check(`https://api.gupshup.io/wa/app/${appId}/msg`);
  await check(`https://api.gupshup.io/wa/app/${appId}/messages`);
  await check(`https://api.gupshup.io/wa/api/v1/template/msg/status/5debba26-dd20-4039-95f3-1f1c4b6599a3`);
  await check(`https://api.gupshup.io/sm/api/v1/msg/5debba26-dd20-4039-95f3-1f1c4b6599a3`);
  await check(`https://api.gupshup.io/wa/app/${appId}/message/status/5debba26-dd20-4039-95f3-1f1c4b6599a3`);
  await check(`https://api.gupshup.io/wa/app/${appId}/template/msg`);
  await check(`https://api.gupshup.io/wa/api/v1/users`);
}

run();
