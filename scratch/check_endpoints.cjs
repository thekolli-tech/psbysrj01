const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID || 'a6c34645-8cbf-4ca8-b6c7-a2d8f5172c25';
const appName = 'propertystudio';
const templateId = env.GUPSHUP_OTP_TEMPLATE_ID || 'b803ba1e-de34-496c-aa01-71db36cf8343';
const token = env.GUPSHUP_CUSTOMER_APP_TOKEN;
const secret = env.GUPSHUP_ACCOUNT_SECRET;

async function checkUrl(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text.slice(0, 100); }
    console.log(`[${res.status}] ${url}:`, typeof json === 'object' ? JSON.stringify(json).slice(0, 200) : json);
  } catch (e) {
    console.log(`[ERR] ${url}:`, e.message);
  }
}

async function run() {
  console.log('Testing template list endpoints...');
  // Variations for template list
  await checkUrl(`https://api.gupshup.io/wa/app/${appId}/template`, { 'apikey': apiKey });
  await checkUrl(`https://api.gupshup.io/wa/api/v1/template/list/${appId}`, { 'apikey': apiKey });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'Authorization': apiKey });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'token': token });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'Authorization': token });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'token': secret });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'Authorization': secret });
  await checkUrl(`https://partner.gupshup.io/partner/app/${appId}/templates`, { 'apikey': apiKey });

  console.log('\nTesting app details endpoints...');
  await checkUrl(`https://api.gupshup.io/wa/api/v1/users`, { 'apikey': apiKey });
  await checkUrl(`https://api.gupshup.io/wa/api/v1/app/${appId}`, { 'apikey': apiKey });
  await checkUrl(`https://api.gupshup.io/sm/api/v1/app/info`, { 'apikey': apiKey });
  await checkUrl(`https://api.gupshup.io/wa/api/v1/app/info`, { 'apikey': apiKey });
  await checkUrl(`https://api.gupshup.io/partner/app/${appId}`, { 'apikey': apiKey });
}

run();
