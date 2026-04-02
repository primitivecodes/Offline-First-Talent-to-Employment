const request = require('supertest');
const express = require('express');
const { setupTestDb, teardownTestDb } = require('./testSetup');
const User = require('../models/User');
const { Certificate } = require('../models/index');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use('/api/auth',         require('../routes/auth'));
app.use('/api/certificates', require('../routes/certificates'));

let learnerToken, adminToken, certId, verificationCode;

describe('Certificate Verification', () => {
  beforeAll(async () => {
    await setupTestDb();

    const lHash = await bcrypt.hash('Learner1', 12);
    const aHash = await bcrypt.hash('Admin123', 12);

    const learner = await User.create({ name: 'Learner', email: 'l@test.com', password: lHash, role: 'learner', isActive: true });
    await User.create({ name: 'Admin', email: 'a@test.com', password: aHash, role: 'admin', isActive: true });

    verificationCode = uuidv4().slice(0, 8).toUpperCase();

    const cert = await Certificate.create({
      learnerId:        learner.id,
      moduleId:         uuidv4(),
      skillArea:        'JavaScript Fundamentals',
      isValid:          true,
      verificationCode,
    });
    certId = cert.id;

    const lr = await request(app).post('/api/auth/login').send({ email: 'l@test.com', password: 'Learner1' });
    const ar = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'Admin123' });
    learnerToken = lr.body.token;
    adminToken   = ar.body.token;
  });

  afterAll(teardownTestDb);

  describe('GET /api/certificates/verify/:code (public)', () => {
    it('verifies a valid certificate without authentication', async () => {
      const res = await request(app).get(`/api/certificates/verify/${verificationCode}`);
      expect(res.status).toBe(200);
      expect(res.body.certificate.verificationCode).toBe(verificationCode);
      expect(res.body.certificate.isValid).toBe(true);
      expect(res.body.learner.name).toBe('Learner');
    });

    it('returns 404 for unknown verification code', async () => {
      const res = await request(app).get('/api/certificates/verify/FAKECODE');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/certificates/:id', () => {
    it('allows learner to view their own certificate', async () => {
      const res = await request(app)
        .get(`/api/certificates/${certId}`)
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.certificate.skillArea).toBe('JavaScript Fundamentals');
    });

    it('blocks learner from viewing another learner certificate', async () => {
      // Create another learner and their cert
      const h2 = await bcrypt.hash('Other123', 12);
      const other = await User.create({ name: 'Other', email: 'other@test.com', password: h2, role: 'learner', isActive: true });
      const otherCert = await Certificate.create({
        learnerId: other.id,
        moduleId: uuidv4(),
        skillArea: 'CSS',
        isValid: true,
        verificationCode: uuidv4().slice(0, 8).toUpperCase(),
      });

      const res = await request(app)
        .get(`/api/certificates/${otherCert.id}`)
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/certificates (my list)', () => {
    it('returns certificates for the authenticated learner', async () => {
      const res = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.certificates)).toBe(true);
      expect(res.body.certificates.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/certificates/:id/revoke', () => {
    it('allows admin to revoke a certificate', async () => {
      const res = await request(app)
        .patch(`/api/certificates/${certId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const verify = await request(app).get(`/api/certificates/verify/${verificationCode}`);
      expect(verify.body.certificate.isValid).toBe(false);
    });

    it('blocks non-admin from revoking', async () => {
      const res = await request(app)
        .patch(`/api/certificates/${certId}/revoke`)
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(403);
    });
  });
});
