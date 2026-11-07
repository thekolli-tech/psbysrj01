const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID || 'a6c34645-8cbf-4ca8-b6c7-a2d8f5172c25';
const appName = 'propertystudio';
const templateId = env.GUPSHUP_OTP_TEMPLATE_ID || 'b803ba1e-de34-496c-aa01-71db36cf8343';
const sourceNumber = env.GUPSHUP_WHATSAPP_NUMBER;
const customerAppToken = env.GUPSHUP_CUSTOMER_APP_TOKEN;
const accountSecret = env.GUPSHUP_ACCOUNT_SECRET;

console.log('AppId:', appId);
console.log('TemplateId:', templateId);
console.log('SourceNumber:', sourceNumber);

async function run() {
  // 1. Check templates on Gupshup for this app
  console.log('\n--- 1. Querying Gupshup Templates ---');
  try {
    const res = await fetch(`https://api.gupshup.io/wa/api/v1/template/list/${appName}`, {
      headers: { 'apikey': apiKey }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Templates response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error fetching templates:', e.message);
  }

  // 2. Check Gupshup Partner/App details with Customer App Token if available
  console.log('\n--- 2. Querying Gupshup Partner App Details ---');
  try {
    const headers = { 'apikey': apiKey };
    if (customerAppToken) headers['token'] = customerAppToken;
    if (accountSecret) headers['Authorization'] = accountSecret;

    const res = await fetch(`https://partner.gupshup.io/partner/app/${appId}`, {
      headers
    });
    const data = await res.json().catch(() => null);
    console.log('Partner App Status:', res.status);
    if (data) {
      console.log('Partner App Data:', JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e) {
    console.error('Error fetching partner app:', e.message);
  }

  // 3. Query Gupshup message status for the message ID from previous tests
  // In previous session: 5debba26-dd20-4039-95f3-1f1c4b6599a3
  console.log('\n--- 3. Querying Message Status ---');
  const testMsgId = '5debba26-dd20-4039-95f3-1f1c4b6599a3';
  try {
    const res = await fetch(`https://api.gupshup.io/wa/api/v1/msg/${testMsgId}`, {
      headers: { 'apikey': apiKey }
    });
    const data = await res.json().catch(() => null);
    console.log('Msg Status HTTP:', res.status);
    console.log('Msg Data:', data);
  } catch (e) {
    console.error('Error fetching msg:', e.message);
  }
}

run();
