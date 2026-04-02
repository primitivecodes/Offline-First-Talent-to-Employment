const request = require('supertest');
const express = require('express');
const { setupTestDb, teardownTestDb } = require('./testSetup');

// Build a minimal app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

describe('Auth Routes', () => {
  beforeAll(async () => { await setupTestDb(); });
  afterAll(async () => { await teardownTestDb(); });

  const learner = {
    name: 'Test Learner',
    email: 'learner@test.com',
    password: 'Password1',
    role: 'learner',
    phone: '250781234567',
  };

  const employer = {
    name: 'Test Employer',
    email: 'employer@test.com',
    password: 'Password1',
    role: 'employer',
    organisation: 'Test Corp',
    phone: '250789876543',
  };

  describe('POST /api/auth/register', () => {
    it('registers a learner successfully', async () => {
      const res = await request(app).post('/api/auth/register').send(learner);
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('learner');
      expect(res.body.user.hasPaidAccess).toBe(false);
      expect(res.body.user.password).toBeUndefined(); // never expose password
    });

    it('registers an employer successfully', async () => {
      const res = await request(app).post('/api/auth/register').send(employer);
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('employer');
    });

    it('rejects duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send(learner);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects missing name', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...learner, email: 'new@test.com', name: '' });
      expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...learner, email: 'new2@test.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/8 characters/i);
    });

    it('rejects password without uppercase letter', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...learner, email: 'new3@test.com', password: 'password1' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role (admin via self-register)', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...learner, email: 'admin@test.com', role: 'admin' });
      expect(res.status).toBe(400);
    });

    it('rejects employer without organisation', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...employer, email: 'emp2@test.com', organisation: '' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...learner, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: learner.email, password: learner.password });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(learner.email);
    });

    it('rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: learner.email, password: 'WrongPass1' });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Password1' });
      expect(res.status).toBe(401);
    });

    it('rejects missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: learner.email });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;
    beforeAll(async () => {
      const res = await request(app).post('/api/auth/login').send({ email: learner.email, password: learner.password });
      token = res.body.token;
    });

    it('returns the current user with a valid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(learner.email);
    });

    it('rejects request with no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer fake.token.here');
      expect(res.status).toBe(401);
    });
  });
});
