const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const BASE_URL         = process.env.MTN_MOMO_BASE_URL         || 'https://sandbox.momodeveloper.mtn.com';
const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const API_USER         = process.env.MTN_MOMO_API_USER;
const API_KEY          = process.env.MTN_MOMO_API_KEY;
const ENVIRONMENT      = process.env.MTN_MOMO_ENVIRONMENT      || 'sandbox';
const CURRENCY         = process.env.MTN_MOMO_CURRENCY         || 'EUR';
const CALLBACK_URL     = process.env.MTN_MOMO_CALLBACK_URL;
const isSandbox        = ENVIRONMENT === 'sandbox';

const getAccessToken = async () => {
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
  const response = await fetch(`${BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization':             `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MTN token error: ${err}`);
  }
  const data = await response.json();
  return data.access_token;
};

const requestPayment = async (phone, amountUSD, payerMessage, payeeNote) => {
  const accessToken = await getAccessToken();
  const referenceId = uuidv4();

  // Sandbox uses EUR and the raw USD amount as the number
  // Production converts to RWF
  const amount   = isSandbox
    ? String(amountUSD)
    : String(Math.round(amountUSD * (parseInt(process.env.USD_TO_RWF) || 1300)));

  // MTN sandbox rejects special characters — strip everything except
  // letters, numbers, spaces, and basic punctuation
  const cleanMessage = (str) =>
    String(str).replace(/[^a-zA-Z0-9 .,]/g, '').slice(0, 50);

  const body = {
    amount,
    currency:   CURRENCY,
    externalId: uuidv4(),
    payer: {
      partyIdType: 'MSISDN',
      partyId:     phone.replace(/^\+/, '').replace(/\s/g, ''),
    },
    payerMessage: cleanMessage(payerMessage || 'Course payment'),
    payeeNote:    cleanMessage(payeeNote    || 'ALU Talent Platform'),
  };

  console.log('[MoMo] Initiating payment:', {
    phone:       body.payer.partyId,
    amount:      body.amount,
    currency:    body.currency,
    environment: ENVIRONMENT,
    message:     body.payerMessage,
    note:        body.payeeNote,
  });

  const headers = {
    'Authorization':             `Bearer ${accessToken}`,
    'X-Reference-Id':            referenceId,
    'X-Target-Environment':      ENVIRONMENT,
    'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
    'Content-Type':              'application/json',
  };

  // Only add callback URL if it is a real public URL (not localhost)
  if (CALLBACK_URL && !CALLBACK_URL.includes('localhost')) {
    headers['X-Callback-Url'] = CALLBACK_URL;
  }

  const response = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });

  if (response.status !== 202) {
    const err = await response.text();
    console.error('[MoMo] Failed. Status:', response.status, 'Body:', err);
    console.error('[MoMo] Request sent:', JSON.stringify(body, null, 2));
    throw new Error(`MTN MoMo request error (${response.status}): ${err}`);
  }

  console.log('[MoMo] Payment initiated successfully. Reference:', referenceId);
  return { referenceId, amount, currency: CURRENCY, amountUSD };
};

const checkPaymentStatus = async (referenceId) => {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: 'GET',
      headers: {
        'Authorization':             `Bearer ${accessToken}`,
        'X-Target-Environment':      ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      },
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MTN status check error: ${err}`);
  }
  const data = await response.json();
  console.log('[MoMo] Status check:', data.status, '| Ref:', referenceId);
  return {
    status:                 data.status,
    reason:                 data.reason || null,
    financialTransactionId: data.financialTransactionId || null,
  };
};

const toRWF = (usd) => Math.round(usd * (parseInt(process.env.USD_TO_RWF) || 1300));

module.exports = { requestPayment, checkPaymentStatus, toRWF };