import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { queueAssessment, isAssessmentQueued } from '../utils/offlineDB';
import toast from 'react-hot-toast';

export const AssessmentPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});
  const [timeLeft,   setTimeLeft]   = useState(null);
  const [phase, setPhase]           = useState('intro'); // intro | taking | submitting | result
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const startTime = useState(null);

  useEffect(() => { fetchAssessment(); }, [id]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'taking' || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const fetchAssessment = async () => {
    try {
      const { data } = await api.get(`/assessments/${id}`);
      const qs = JSON.parse(data.assessment.questions || '[]');
      setAssessment(data.assessment);
      setQuestions(qs);
    } catch {
      toast.error('Could not load assessment.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = () => {
    setTimeLeft(assessment.durationMinutes * 60);
    setPhase('taking');
  };

  const answer = (qIdx, value) => setAnswers((a) => ({ ...a, [qIdx]: value }));

  const handleSubmit = useCallback(async () => {
    if (phase === 'submitting') return;
    setPhase('submitting');
    const elapsed = assessment.durationMinutes * 60 - (timeLeft || 0);
    const timeTakenMinutes = Math.ceil(elapsed / 60);

    try {
      const { data } = await api.post(`/assessments/${id}/submit`, {
        answers,
        timeTakenMinutes,
      });
      setResult(data);
      setPhase('result');
      if (data.passed) toast.success('You passed! 🎉');
      else toast('Keep studying and try again.', { icon: '📚' });
    } catch (err) {
      if (!navigator.onLine) {
        // Queue for later — will be submitted automatically when back online
        await queueAssessment(id, answers, timeTakenMinutes);
        setPhase('queued');
        toast('📴 No internet — your answers are saved and will submit when you reconnect.', { duration: 6000 });
      } else {
        toast.error('Could not submit assessment. Please try again.');
        setPhase('taking');
      }
    }
  }, [phase, answers, timeLeft, id, assessment]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading)             return <div style={loadPage}><div style={spin} /></div>;

  // ── QUEUED OFFLINE SCREEN ────────────────────────────
  if (phase === 'queued') return (
    <div style={centerPage}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📴</div>
        <h2 style={{ color: '#1e3a5f', marginBottom: 12 }}>Answers Saved</h2>
        <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
          You are currently offline. Your assessment answers have been saved to your device
          and will be automatically submitted to the server as soon as you reconnect to the internet.
        </p>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 20px', marginBottom: 24, fontSize: 14, color: '#1d4ed8', lineHeight: 1.6 }}>
          💡 You do not need to do anything. Simply reconnect and the submission will happen automatically in the background.
        </div>
        <button style={bigSubmitBtn} onClick={() => navigate('/dashboard/learner')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
  if (!assessment)         return null;

  // ── INTRO SCREEN ─────────────────────────────────────
  if (phase === 'intro') return (
    <div style={centerPage}>
      <div style={card}>
        <div style={{ fontSize: 48, textAlign: 'center' }}>📝</div>
        <h2 style={cardTitle}>{assessment.title}</h2>
        <div style={infoGrid}>
          <InfoBox label="Questions" value={questions.length} />
          <InfoBox label="Max Score"  value={assessment.maxScore} />
          <InfoBox label="Pass Mark"  value={`${assessment.passMark}%`} />
          <InfoBox label="Time Limit" value={`${assessment.durationMinutes} min`} />
        </div>
        <div style={noteBox}>
          <strong>Before you start:</strong> read each question carefully. You cannot go back once you submit. 
          The timer starts when you click Start.
        </div>
        <div style={btnRow}>
          <button style={secBtn} onClick={() => navigate(-1)}>Go Back</button>
          <button style={priBtn} onClick={startAssessment}>Start Assessment</button>
        </div>
      </div>
    </div>
  );

  // ── TAKING SCREEN ─────────────────────────────────────
  if (phase === 'taking' || phase === 'submitting') {
    const answered = Object.keys(answers).length;
    const total    = questions.length;
    const pct      = Math.round((answered / total) * 100);
    const urgent   = timeLeft !== null && timeLeft < 120;

    return (
      <div style={takingPage}>
        {/* Sticky header */}
        <div style={quizHeader}>
          <span style={quizTitle}>{assessment.title}</span>
          <div style={quizMeta}>
            <span style={{ color: '#64748b', fontSize: 13 }}>{answered}/{total} answered</span>
            <div style={timerBox(urgent)}>⏱ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}</div>
            <button
              style={submitHdrBtn}
              onClick={handleSubmit}
              disabled={phase === 'submitting'}
            >
              {phase === 'submitting' ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={quizBar}>
          <div style={{ ...quizBarFill, width: `${pct}%` }} />
        </div>

        {/* Questions */}
        <div style={qList}>
          {questions.map((q, qi) => (
            <div key={qi} style={qCard(answers[qi] !== undefined)}>
              <p style={qText}><strong>Q{qi + 1}.</strong> {q.question}</p>
              {q.type === 'mcq' && (
                <div style={optList}>
                  {q.options.map((opt, oi) => (
                    <label key={oi} style={optLabel(answers[qi] === oi)}>
                      <input
                        type="radio"
                        name={`q_${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => answer(qi, oi)}
                        style={{ marginRight: 10 }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'true_false' && (
                <div style={optList}>
                  {['True', 'False'].map((opt, oi) => (
                    <label key={oi} style={optLabel(answers[qi] === oi)}>
                      <input type="radio" name={`q_${qi}`} checked={answers[qi] === oi} onChange={() => answer(qi, oi)} style={{ marginRight: 10 }} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'short_answer' && (
                <textarea
                  style={shortInput}
                  placeholder="Type your answer..."
                  value={answers[qi] || ''}
                  onChange={(e) => answer(qi, e.target.value)}
                  rows={3}
                />
              )}
            </div>
          ))}

          <button style={bigSubmitBtn} onClick={handleSubmit} disabled={phase === 'submitting'}>
            {phase === 'submitting' ? 'Grading...' : `Submit Assessment (${answered}/${total} answered)`}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ─────────────────────────────────────
  if (phase === 'result' && result) return (
    <div style={centerPage}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>{result.passed ? '🏆' : '📚'}</div>
        <h2 style={{ color: result.passed ? '#065f46' : '#b45309', margin: '12px 0 4px' }}>
          {result.passed ? 'Congratulations! You passed!' : 'Not quite — keep going!'}
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 28px' }}>
          {result.passed
            ? 'A certificate has been added to your portfolio.'
            : 'Review the module and try again when you are ready.'}
        </p>

        <div style={scoreCircle(result.passed)}>
          <div style={scoreBig}>{result.score}</div>
          <div style={scoreLabel}>out of {assessment.maxScore}</div>
        </div>

        <div style={resultGrid}>
          <ResultBox label="Your Score"   value={`${result.score}/${assessment.maxScore}`} />
          <ResultBox label="Pass Mark"    value={`${assessment.passMark}%`} />
          <ResultBox label="Result"       value={result.passed ? 'PASSED ✓' : 'FAILED ✗'} color={result.passed ? '#065f46' : '#dc2626'} />
          <ResultBox label="Time Taken"   value={`${result.timeTakenMinutes} min`} />
        </div>

        {result.passed && result.certificate && (
          <div style={certBanner}>
            🎓 Certificate issued: <strong>{result.certificate.skillArea}</strong>
            <button style={viewCertBtn} onClick={() => navigate(`/certificate/${result.certificate.id}`)}>
              View Certificate
            </button>
          </div>
        )}

        <div style={btnRow}>
          <button style={secBtn} onClick={() => navigate('/dashboard/learner')}>Back to Dashboard</button>
          {!result.passed && <button style={priBtn} onClick={() => { setAnswers({}); startAssessment(); }}>Try Again</button>}
          {result.passed && <button style={priBtn} onClick={() => navigate('/dashboard/learner')}>Continue Learning</button>}
        </div>
      </div>
    </div>
  );

  return null;
};

// ── Small components ───────────────────────────────────
const InfoBox = ({ label, value }) => (
  <div style={infoBoxStyle}>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
  </div>
);

const ResultBox = ({ label, value, color }) => (
  <div style={resultBoxStyle}>
    <div style={{ fontSize: 18, fontWeight: 700, color: color || '#1e3a5f' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
  </div>
);

// ── Styles ─────────────────────────────────────────────
const loadPage    = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const spin        = { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' };
const centerPage  = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: 20 };
const card        = { background: '#fff', borderRadius: 20, padding: '40px 48px', maxWidth: 580, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 20 };
const cardTitle   = { margin: 0, color: '#1e3a5f', fontSize: 24, fontWeight: 800, textAlign: 'center' };
const infoGrid    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const infoBoxStyle = { background: '#f8fafc', borderRadius: 10, padding: '16px 20px', textAlign: 'center' };
const noteBox     = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, fontSize: 13, color: '#1e40af', lineHeight: 1.6 };
const btnRow      = { display: 'flex', gap: 12, marginTop: 4 };
const priBtn      = { flex: 2, padding: 14, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const secBtn      = { flex: 1, padding: 14, background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 };
const takingPage  = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const quizHeader  = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 };
const quizTitle   = { fontWeight: 700, color: '#1e3a5f', fontSize: 15 };
const quizMeta    = { display: 'flex', gap: 16, alignItems: 'center' };
const timerBox    = (urgent) => ({ padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 15, background: urgent ? '#fef2f2' : '#f1f5f9', color: urgent ? '#dc2626' : '#334155', fontVariantNumeric: 'tabular-nums' });
const submitHdrBtn = { padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const quizBar     = { height: 4, background: '#e2e8f0' };
const quizBarFill = { height: '100%', background: '#1d4ed8', transition: 'width 0.3s' };
const qList       = { maxWidth: 760, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 };
const qCard       = (ans) => ({ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `2px solid ${ans ? '#bfdbfe' : '#e2e8f0'}` });
const qText       = { margin: '0 0 16px', color: '#1e3a5f', fontSize: 15, lineHeight: 1.6 };
const optList     = { display: 'flex', flexDirection: 'column', gap: 10 };
const optLabel    = (sel) => ({ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${sel ? '#1d4ed8' : '#e2e8f0'}`, background: sel ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 14, color: '#334155' });
const shortInput  = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' };
const bigSubmitBtn = { padding: '16px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15, marginTop: 8 };
const scoreCircle = (passed) => ({ width: 140, height: 140, borderRadius: '50%', background: passed ? '#d1fae5' : '#fef3c7', border: `4px solid ${passed ? '#065f46' : '#d97706'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto' });
const scoreBig    = { fontSize: 36, fontWeight: 800, color: '#1e3a5f' };
const scoreLabel  = { fontSize: 12, color: '#64748b' };
const resultGrid  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const resultBoxStyle = { background: '#f8fafc', borderRadius: 10, padding: '14px 16px', textAlign: 'center' };
const certBanner  = { background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 20px', fontSize: 14, color: '#065f46', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const viewCertBtn = { padding: '6px 16px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginLeft: 'auto' };
