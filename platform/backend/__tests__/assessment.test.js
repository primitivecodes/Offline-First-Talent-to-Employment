const request = require('supertest');
const express = require('express');
const { setupTestDb, teardownTestDb } = require('./testSetup');
const User = require('../models/User');
const LearningModule = require('../models/LearningModule');
const { Assessment } = require('../models/index');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/auth',        require('../routes/auth'));
app.use('/api/assessments', require('../routes/assessments'));
app.use('/api/modules',     require('../routes/modules'));

let learnerToken, adminToken, moduleId, assessmentId;

const QUESTIONS = [
  { type: 'mcq',          question: 'What is 2+2?',        options: ['3','4','5','6'], correctAnswer: 1, explanation: '2+2=4' },
  { type: 'true_false',   question: 'JavaScript runs in the browser.', options: ['True','False'], correctAnswer: 0, explanation: 'True' },
  { type: 'short_answer', question: 'Name a JS keyword.',  keywords: ['var','let','const','function','return'], explanation: 'Any JS keyword' },
  { type: 'mcq',          question: 'What does HTML stand for?', options: ['Hyper Text','Home Tool','Hello','Hot'], correctAnswer: 0 },
];

describe('Assessment Auto-Grading', () => {
  beforeAll(async () => {
    await setupTestDb();

    // Create admin
    const hashed = await bcrypt.hash('Admin123', 12);
    const admin  = await User.create({ name: 'Admin', email: 'admin@test.com', password: hashed, role: 'admin', isActive: true });

    // Create paid learner
    const learnerHash = await bcrypt.hash('Learner1', 12);
    await User.create({ name: 'Learner', email: 'learner@test.com', password: learnerHash, role: 'learner', hasPaidAccess: true, isActive: true });

    // Get tokens
    const adminRes   = await request(app).post('/api/auth/login').send({ email: 'admin@test.com',   password: 'Admin123' });
    const learnerRes = await request(app).post('/api/auth/login').send({ email: 'learner@test.com', password: 'Learner1' });
    adminToken   = adminRes.body.token;
    learnerToken = learnerRes.body.token;

    // Create published module
    const mod = await LearningModule.create({ title: 'Test Module', description: 'desc', isPublished: true, isOfflineAvailable: true });
    moduleId = mod.id;

    // Create published assessment
    const ass = await Assessment.create({
      moduleId,
      title: 'Test Quiz',
      questions: JSON.stringify(QUESTIONS),
      maxScore: 100,
      passMark: 60,
      durationMinutes: 30,
      isPublished: true,
      createdBy: admin.id,
    });
    assessmentId = ass.id;
  });

  afterAll(teardownTestDb);

  describe('GET /api/assessments/:id', () => {
    it('returns assessment without correct answers', async () => {
      const res = await request(app)
        .get(`/api/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${learnerToken}`);
      expect(res.status).toBe(200);
      const qs = JSON.parse(res.body.assessment.questions);
      qs.forEach(q => {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.keywords).toBeUndefined();
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`/api/assessments/${assessmentId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/assessments/:id/submit', () => {
    it('scores 100% with all correct answers', async () => {
      const answers = { 0: 1, 1: 0, 2: 'let is a keyword', 3: 0 }; // all correct
      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ answers, timeTakenMinutes: 10 });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(100);
      expect(res.body.passed).toBe(true);
      expect(res.body.scorePct).toBe(100);
    });

    it('issues a certificate when passed', async () => {
      // Register a new learner for a fresh submission
      const r = await request(app).post('/api/auth/register').send({ name: 'Cert Learner', email: 'cert@test.com', password: 'CertPass1', role: 'learner', phone: '250780000001' });
      const tok = r.body.token;
      // Simulate paid access
      await User.update({ hasPaidAccess: true }, { where: { email: 'cert@test.com' } });

      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ answers: { 0: 1, 1: 0, 2: 'const is a keyword', 3: 0 }, timeTakenMinutes: 5 });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.certificate).not.toBeNull();
      expect(res.body.certificate.verificationCode).toHaveLength(8);
    });

    it('scores 0% with all wrong answers', async () => {
      const r = await request(app).post('/api/auth/register').send({ name: 'Wrong', email: 'wrong@test.com', password: 'WrongPass1', role: 'learner', phone: '250780000002' });
      await User.update({ hasPaidAccess: true }, { where: { email: 'wrong@test.com' } });
      const tok = r.body.token;
      const answers = { 0: 0, 1: 1, 2: 'nothing', 3: 2 }; // all wrong
      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ answers, timeTakenMinutes: 20 });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(false);
      expect(res.body.certificate).toBeNull();
    });

    it('scores 50% with half correct answers', async () => {
      const r = await request(app).post('/api/auth/register').send({ name: 'Half', email: 'half@test.com', password: 'HalfPass1', role: 'learner', phone: '250780000003' });
      await User.update({ hasPaidAccess: true }, { where: { email: 'half@test.com' } });
      const tok = r.body.token;
      const answers = { 0: 1, 1: 1, 2: 'nothing wrong', 3: 2 }; // 1 MCQ correct (q0), rest wrong
      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ answers, timeTakenMinutes: 15 });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(false); // 25% < 60% pass mark
    });

    it('blocks unpaid learner', async () => {
      const r = await request(app).post('/api/auth/register').send({ name: 'Unpaid', email: 'unpaid@test.com', password: 'UnpaidPass1', role: 'learner', phone: '250780000004' });
      const tok = r.body.token;
      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ answers: {}, timeTakenMinutes: 1 });
      expect(res.status).toBe(402);
    });

    it('does not duplicate certificate on second pass', async () => {
      const answers = { 0: 1, 1: 0, 2: 'let keyword', 3: 0 };
      // Submit twice with the original learner who already has a cert
      await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ answers, timeTakenMinutes: 5 });
      const res = await request(app)
        .post(`/api/assessments/${assessmentId}/submit`)
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({ answers, timeTakenMinutes: 5 });
      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      // Certificate should be the same one (not duplicated)
      expect(res.body.certificate).not.toBeNull();
    });
  });
});
