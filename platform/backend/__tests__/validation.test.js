const request = require('supertest');
const express = require('express');
const { setupTestDb, teardownTestDb } = require('./testSetup');

const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

describe('Input Validation', () => {
  beforeAll(setupTestDb);
  afterAll(teardownTestDb);

  const base = { name: 'Valid User', email: 'valid@test.com', password: 'Valid123', role: 'learner', phone: '250781234567' };

  describe('Registration validation', () => {
    const cases = [
      { desc: 'name too short',         body: { ...base, email: 'a@t.com', name: 'A' },              expectStatus: 400 },
      { desc: 'name too long',          body: { ...base, email: 'b@t.com', name: 'X'.repeat(101) },  expectStatus: 400 },
      { desc: 'invalid email',          body: { ...base, email: 'not-email' },                        expectStatus: 400 },
      { desc: 'password too short',     body: { ...base, email: 'c@t.com', password: 'Ab1' },         expectStatus: 400 },
      { desc: 'password no uppercase',  body: { ...base, email: 'd@t.com', password: 'password1' },   expectStatus: 400 },
      { desc: 'password no number',     body: { ...base, email: 'e@t.com', password: 'Password' },    expectStatus: 400 },
      { desc: 'invalid role',           body: { ...base, email: 'f@t.com', role: 'superadmin' },      expectStatus: 400 },
      { desc: 'valid registration',     body: { ...base, email: 'valid@test.com' },                   expectStatus: 201 },
    ];

    cases.forEach(({ desc, body, expectStatus }) => {
      it(desc, async () => {
        const res = await request(app).post('/api/auth/register').send(body);
        expect(res.status).toBe(expectStatus);
      });
    });
  });

  describe('Login validation', () => {
    it('rejects missing email field', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: 'Valid123' });
      expect(res.status).toBe(400);
    });

    it('rejects malformed email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'Valid123' });
      expect(res.status).toBe(400);
    });

    it('rejects missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'valid@test.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('Forgot password validation', () => {
    it('rejects non-email address', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'notanemail' });
      expect(res.status).toBe(400);
    });

    it('accepts valid email (always returns 200 to prevent enumeration)', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@test.com' });
      expect(res.status).toBe(200);
    });
  });
});
