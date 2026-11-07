const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.prod.local'));
const apiKey = env.GUPSHUP_API_KEY;
const appId = env.GUPSHUP_APP_ID || 'a6c34645-8cbf-4ca8-b6c7-a2d8f5172c25';

async function run() {
  const res = await fetch(`https://api.gupshup.io/wa/app/${appId}/template`, {
    headers: { 'apikey': apiKey }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
