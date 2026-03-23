const request = require('supertest');
const express = require('express');
const { setupTestDb, teardownTestDb } = require('./testSetup');
const User = require('../models/User');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/auth',     require('../routes/auth'));
app.use('/api/payments', require('../routes/payments'));

let learnerToken, employerToken, learnerId, employerId;

describe('Payment Flow', () => {
  beforeAll(async () => {
    await setupTestDb();

    const lHash = await bcrypt.hash('Learner1', 12);
    const eHash = await bcrypt.hash('Employer1', 12);

    const learner  = await User.create({ name: 'L', email: 'l@test.com', password: lHash, role: 'learner',  isActive: true, hasPaidAccess: false });
    const employer = await User.create({ name: 'E', email: 'e@test.com', password: eHash, role: 'employer', isActive: true, subscriptionStatus: 'inactive', organisation: 'Corp' });
    learnerId  = learner.id;
    employerId = employer.id;

    const lr = await request(app).post('/api/auth/login').send({ email: 'l@test.com', password: 'Learner1' });
    const er = await request(app).post('/api/auth/login').send({ email: 'e@test.com', password: 'Employer1' });
    learnerToken  = lr.body.token;
    employerToken = er.body.token;
  });

  afterAll(teardownTestDb);

  describe('POST /api/payments/learner/initiate', () => {
    it('initiates payment for learner', async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ phone: '250781234567' });
      expect(res.status).toBe(200);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.amountUSD).toBe(10);
      expect(res.body.status).toBe('pending');
    });

    it('rejects missing phone number', async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/phone/i);
    });

    it('rejects phone with spaces or + symbol', async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ phone: '+250 781 234 567' });
      expect(res.status).toBe(400);
    });

    it('blocks employer from using learner payment route', async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ phone: '250789876543' });
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .send({ phone: '250781234567' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/payments/employer/initiate', () => {
    it('initiates subscription payment for employer', async () => {
      const res = await request(app)
        .post('/api/payments/employer/initiate')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ phone: '250789876543' });
      expect(res.status).toBe(200);
      expect(res.body.amountUSD).toBe(20);
    });

    it('blocks learner from employer route', async () => {
      const res = await request(app)
        .post('/api/payments/employer/initiate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ phone: '250781234567' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/payments/verify/:id', () => {
    let paymentId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/payments/learner/initiate')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ phone: '250781234567' });
      paymentId = res.body.paymentId;
    });

    it('returns payment status', async () => {
      const res = await request(app)
        .get(`/api/payments/verify/${paymentId}`)
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(200);
      expect(['pending', 'successful', 'failed']).toContain(res.body.status);
    });

    it('returns 404 for unknown payment id', async () => {
      const res = await request(app)
        .get('/api/payments/verify/nonexistent-id-12345')
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/payments/my-payments', () => {
    it('returns payment history for authenticated user', async () => {
      const res = await request(app)
        .get('/api/payments/my-payments')
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.payments)).toBe(true);
    });
  });

  describe('MoMo Webhook POST /api/payments/momo-callback', () => {
    it('accepts and processes a successful callback', async () => {
      // Create a pending payment to update
      const payment = await Payment.create({
        userId: learnerId,
        type: 'learner_access',
        amount: 13000,
        amountUSD: 10,
        currency: 'RWF',
        phone: '250781111111',
        status: 'pending',
        momoReferenceId: 'webhook-test-ref',
      });

      const res = await request(app)
        .post('/api/payments/momo-callback')
        .send({
          referenceId:     'webhook-test-ref',
          status:          'SUCCESSFUL',
          financialTransactionId: 'TXN123',
        });

      expect(res.status).toBe(200);

      // Learner should now have paid access
      const updated = await User.findByPk(learnerId);
      expect(updated.hasPaidAccess).toBe(true);
    });
  });
});
