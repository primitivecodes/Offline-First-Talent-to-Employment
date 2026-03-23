const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const BASE_URL = process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MTN_MOMO_API_USER;
const API_KEY = process.env.MTN_MOMO_API_KEY;
const ENVIRONMENT = process.env.MTN_MOMO_ENVIRONMENT || 'sandbox';
const CURRENCY = process.env.MTN_MOMO_CURRENCY || 'RWF';
const CALLBACK_URL = process.env.MTN_MOMO_CALLBACK_URL;

// USD to RWF approximate rate (update periodically or fetch live)
const USD_TO_RWF = 1300;

/**
 * Convert USD amount to RWF
 */
const toRWF = (usd) => Math.round(usd * USD_TO_RWF);

/**
 * Get a Bearer token from MTN MoMo Collections API
 */
const getAccessToken = async () => {
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
  const response = await fetch(`${BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
    },
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MTN MoMo token error: ${err}`);
  }
  const data = await response.json();
  return data.access_token;
};

/**
 * Initiate a payment request to a phone number
 * @param {string} phone  - MTN phone number (e.g. 250781234567)
 * @param {number} amountUSD - Amount in USD
 * @param {string} payerMessage - Short message shown to payer
 * @param {string} payeeNote   - Internal note
 * @returns {{ referenceId: string, amountRWF: number }}
 */
const requestPayment = async (phone, amountUSD, payerMessage, payeeNote) => {
  const accessToken = await getAccessToken();
  const referenceId = uuidv4();
  const amountRWF = toRWF(amountUSD);

  const body = {
    amount: String(amountRWF),
    currency: CURRENCY,
    externalId: uuidv4(),
    payer: {
      partyIdType: 'MSISDN',
      partyId: phone.replace(/^\+/, ''), // strip leading +
    },
    payerMessage,
    payeeNote,
  };

  const response = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': ENVIRONMENT,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
      ...(CALLBACK_URL && { 'X-Callback-Url': CALLBACK_URL }),
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 202) {
    const err = await response.text();
    throw new Error(`MTN MoMo request error: ${err}`);
  }

  return { referenceId, amountRWF, amountUSD };
};

/**
 * Check the status of a payment request
 * @param {string} referenceId - UUID used when creating the request
 * @returns {{ status: 'SUCCESSFUL'|'FAILED'|'PENDING', reason?: string }}
 */
const checkPaymentStatus = async (referenceId) => {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Target-Environment': ENVIRONMENT,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MTN MoMo status check error: ${err}`);
  }

  const data = await response.json();
  return {
    status: data.status,           // SUCCESSFUL | FAILED | PENDING
    reason: data.reason || null,   // failure reason if any
    financialTransactionId: data.financialTransactionId || null,
  };
};

module.exports = { requestPayment, checkPaymentStatus, toRWF };
