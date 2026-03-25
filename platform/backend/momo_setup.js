const https = require('https');

const SUBSCRIPTION_KEY = 'ec6cddbf378346aaa687bdbf6d5604fb';
const API_USER_ID      = 'db194171-82e5-4ec6-8b5a-3323a428781e';

function createApiUser() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ providerCallbackHost: 'localhost' });
    const options = {
      hostname: 'sandbox.momodeveloper.mtn.com',
      path:     '/v1_0/apiuser',
      method:   'POST',
      headers:  {
        'X-Reference-Id':            API_USER_ID,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type':              'application/json',
        'Content-Length':            Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      console.log('Create API User status:', res.statusCode);
      if (res.statusCode === 201) {
        console.log('API User created successfully.');
        resolve();
      } else {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => reject(new Error(`Failed to create API user. Status: ${res.statusCode} Body: ${d}`)));
      }
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function createApiKey() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sandbox.momodeveloper.mtn.com',
      path:     `/v1_0/apiuser/${API_USER_ID}/apikey`,
      method:   'POST',
      headers:  {
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log('Your API Key:', parsed.apiKey);
        resolve(parsed.apiKey);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

createApiUser()
  .then(() => createApiKey())
  .then((apiKey) => {
    console.log('\n=== COPY THESE INTO YOUR .env FILE ===');
    console.log('MTN_MOMO_API_USER=' + API_USER_ID);
    console.log('MTN_MOMO_API_KEY='  + apiKey);
    console.log('======================================');
  })
  .catch(err => console.error('Error:', err.message));