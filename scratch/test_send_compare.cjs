const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID || 'a6c34645-8cbf-4ca8-b6c7-a2d8f5172c25';
const appName = 'propertystudio';
const templateId = env.GUPSHUP_OTP_TEMPLATE_ID || 'b803ba1e-de34-496c-aa01-71db36cf8343';
const source = (env.GUPSHUP_WHATSAPP_NUMBER || '919014555566').replace(/^\+/, '');
const testPhone = '919014555566'; // Let's test with the source or test number

async function testSendV1() {
  console.log('--- Testing /wa/api/v1/template/msg ---');
  const bodyParams = new URLSearchParams();
  bodyParams.set('channel', 'whatsapp');
  bodyParams.set('source', source);
  bodyParams.set('destination', testPhone);
  bodyParams.set('src.name', appName);
  bodyParams.set('template', JSON.stringify({
    id: templateId,
    params: ['123456', '123456']
  }));

  try {
    const res = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: bodyParams.toString()
    });
    const text = await res.text();
    console.log(`[${res.status}] v1 response:`, text);
  } catch (e) {
    console.error('v1 error:', e.message);
  }
}

async function testSendAppEndpoint() {
  console.log('\n--- Testing /wa/app/{appId}/template/msg ---');
  const bodyParams = new URLSearchParams();
  bodyParams.set('source', source);
  bodyParams.set('destination', testPhone);
  bodyParams.set('template', JSON.stringify({
    id: templateId,
    params: ['123456', '123456']
  }));

  try {
    const res = await fetch(`https://api.gupshup.io/wa/app/${appId}/template/msg`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: bodyParams.toString()
    });
    const text = await res.text();
    console.log(`[${res.status}] app endpoint response:`, text);
  } catch (e) {
    console.error('app endpoint error:', e.message);
  }
}

async function run() {
  await testSendV1();
  await testSendAppEndpoint();
}

run();
