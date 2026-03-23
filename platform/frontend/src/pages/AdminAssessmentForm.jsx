import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EMPTY_QUESTION = {
  type: 'mcq',
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  keywords: [],
  explanation: '',
};

export const AdminAssessmentForm = () => {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const isMentor         = user?.role === 'mentor';
  const backPath         = isMentor ? '/dashboard/mentor' : '/dashboard/admin';

  const [modules,   setModules]   = useState([]);
  const [form,      setForm]      = useState({
    moduleId: '', title: '', maxScore: 100, passMark: 60, durationMinutes: 30,
  });
  const [questions, setQuestions] = useState([{ ...EMPTY_QUESTION }]);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    api.get('/modules')
      .then(({ data }) => {
        const all = data.modules || [];
        // Mentors only see modules matching their expertise
        if (isMentor) {
          const expertise = (user?.expertise || '').toLowerCase();
          const filtered = expertise
            ? all.filter(m => {
                const track = (m.track || '').toLowerCase();
                return track.includes(expertise) || expertise.includes(track);
              })
            : all;
          setModules(filtered);
        } else {
          setModules(all);
        }
      })
      .catch(() => {});
  }, []);

  const changeForm   = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const changeQ = (qi, field, value) => {
    const qs = [...questions];
    qs[qi]   = { ...qs[qi], [field]: value };
    setQuestions(qs);
  };

  const changeOption = (qi, oi, value) => {
    const qs   = [...questions];
    const opts = [...qs[qi].options];
    opts[oi]   = value;
    qs[qi]     = { ...qs[qi], options: opts };
    setQuestions(qs);
  };

  const addQuestion    = () => setQuestions([...questions, { ...EMPTY_QUESTION, options: ['', '', '', ''] }]);
  const removeQuestion = (qi) => setQuestions(questions.filter((_, i) => i !== qi));

  const submit = async (publish = false) => {
    if (!form.moduleId || !form.title) { toast.error('Module and title are required.'); return; }
    if (questions.some(q => !q.question.trim())) { toast.error('All questions must have text.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/assessments', {
        ...form,
        questions: JSON.stringify(questions),
      });
      if (publish) {
        await api.patch(`/assessments/${data.assessment.id}/publish`);
        toast.success(isMentor
          ? 'Assessment created and published for your module!'
          : 'Assessment created and published!'
        );
      } else {
        toast.success('Assessment saved as draft.');
      }
      navigate(backPath);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={page}>
      {/* ── Header ──────────────────────────────── */}
      <div style={header}>
        <button style={backBtn} onClick={() => navigate(backPath)}>← Back</button>
        <h2 style={headerTitle}>
          {isMentor ? 'Create Assessment for Your Module' : 'Create Assessment'}
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={draftBtn} onClick={() => submit(false)} disabled={saving}>
            Save Draft
          </button>
          <button style={isMentor ? mentorPubBtn : pubBtn} onClick={() => submit(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      <div style={bodyWrap}>

        {/* Mentor notice */}
        {isMentor && (
          <div style={noticeBox}>
            ℹ️ You can create assessments for the modules you teach. Only modules matching your
            expertise (<strong>{user?.expertise || 'not set'}</strong>) are shown below.
          </div>
        )}

        {/* ── Settings ────────────────────────────── */}
        <div style={settingsCard}>
          <h4 style={secTitle}>Assessment Settings</h4>
          <div style={grid2}>
            <Field label="Module *">
              <select style={input} name="moduleId" value={form.moduleId} onChange={changeForm}>
                <option value="">Select a module</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              {isMentor && modules.length === 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                  No modules found matching your expertise. Submit a module first.
                </p>
              )}
            </Field>
            <Field label="Assessment Title *">
              <input
                style={input}
                name="title"
                value={form.title}
                onChange={changeForm}
                placeholder="e.g. JS Fundamentals Quiz"
              />
            </Field>
            <Field label="Max Score">
              <input style={input} type="number" name="maxScore" value={form.maxScore} onChange={changeForm} min={1} />
            </Field>
            <Field label="Pass Mark (%)">
              <input style={input} type="number" name="passMark" value={form.passMark} onChange={changeForm} min={1} max={100} />
            </Field>
            <Field label="Time Limit (minutes)">
              <input style={input} type="number" name="durationMinutes" value={form.durationMinutes} onChange={changeForm} min={5} />
            </Field>
          </div>
        </div>

        {/* ── Questions ───────────────────────────── */}
        <div style={qSection}>
          <div style={qHeader}>
            <h4 style={secTitle}>{questions.length} Question{questions.length !== 1 ? 's' : ''}</h4>
            <button style={addQBtn} onClick={addQuestion}>+ Add Question</button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} style={qCard}>
              <div style={qTop}>
                <span style={qNum}>Q{qi + 1}</span>
                <select
                  style={{ ...input, flex: 1, maxWidth: 180 }}
                  value={q.type}
                  onChange={(e) => changeQ(qi, 'type', e.target.value)}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
                {questions.length > 1 && (
                  <button style={removeBtn} onClick={() => removeQuestion(qi)}>✕ Remove</button>
                )}
              </div>

              <Field label="Question Text *">
                <textarea
                  style={{ ...input, height: 72, resize: 'vertical' }}
                  value={q.question}
                  onChange={(e) => changeQ(qi, 'question', e.target.value)}
                  placeholder="Type your question here..."
                />
              </Field>

              {/* Multiple choice */}
              {q.type === 'mcq' && (
                <Field label="Options — select the correct one">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={optRow}>
                        <input
                          type="radio"
                          name={`correct_${qi}`}
                          checked={q.correctAnswer === oi}
                          onChange={() => changeQ(qi, 'correctAnswer', oi)}
                          style={{ flexShrink: 0 }}
                        />
                        <input
                          style={{ ...input, flex: 1 }}
                          value={opt}
                          onChange={(e) => changeOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p style={hint}>Click the radio button next to the correct answer.</p>
                </Field>
              )}

              {/* True / False */}
              {q.type === 'true_false' && (
                <Field label="Correct Answer">
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{ label: 'True', val: 0 }, { label: 'False', val: 1 }].map(({ label, val }) => (
                      <label key={val} style={tfLabel(q.correctAnswer === val)}>
                        <input
                          type="radio"
                          name={`tf_${qi}`}
                          checked={q.correctAnswer === val}
                          onChange={() => changeQ(qi, 'correctAnswer', val)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              {/* Short answer */}
              {q.type === 'short_answer' && (
                <Field label="Keywords for auto-grading (comma-separated)">
                  <input
                    style={input}
                    value={(q.keywords || []).join(', ')}
                    onChange={(e) =>
                      changeQ(qi, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))
                    }
                    placeholder="e.g. variable, declaration, let"
                  />
                  <p style={hint}>Answer is marked correct if it contains any of these keywords.</p>
                </Field>
              )}

              <Field label="Explanation (shown to learner after submission)">
                <input
                  style={input}
                  value={q.explanation}
                  onChange={(e) => changeQ(qi, 'explanation', e.target.value)}
                  placeholder="Brief explanation of the correct answer (optional)"
                />
              </Field>
            </div>
          ))}

          <button style={addQBtnLg} onClick={addQuestion}>+ Add Another Question</button>
        </div>
      </div>
    </div>
  );
};

// ── Field wrapper ──────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={field}>
    <label style={fieldLabel}>{label}</label>
    {children}
  </div>
);

// ── Styles ─────────────────────────────────────────────
const page         = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const header       = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, zIndex: 10 };
const backBtn      = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const headerTitle  = { margin: 0, color: '#1e3a5f', fontSize: 18, fontWeight: 700, flex: 1 };
const draftBtn     = { padding: '8px 16px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#334155' };
const pubBtn       = { padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 };
const mentorPubBtn = { padding: '8px 20px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 };
const noticeBox    = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1e40af', lineHeight: 1.6 };
const bodyWrap     = { maxWidth: 920, margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 };
const settingsCard = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' };
const secTitle     = { margin: '0 0 18px', fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' };
const grid2        = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const field        = { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 };
const fieldLabel   = { fontSize: 13, fontWeight: 600, color: '#475569' };
const input        = { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };
const qSection     = { display: 'flex', flexDirection: 'column', gap: 16 };
const qHeader      = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const addQBtn      = { padding: '8px 18px', background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 };
const addQBtnLg    = { padding: '12px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#64748b', width: '100%' };
const qCard        = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1.5px solid #e2e8f0' };
const qTop         = { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 };
const qNum         = { background: '#1d4ed8', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 };
const removeBtn    = { padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 };
const optRow       = { display: 'flex', gap: 10, alignItems: 'center' };
const tfLabel      = (sel) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${sel ? '#1d4ed8' : '#e2e8f0'}`, background: sel ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 });
const hint         = { margin: '6px 0 0', fontSize: 12, color: '#94a3b8' };