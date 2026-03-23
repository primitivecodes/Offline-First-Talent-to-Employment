import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const AdminModuleForm = () => {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const isMentor       = user?.role === 'mentor';
  const backPath       = isMentor ? '/dashboard/mentor' : '/dashboard/admin';

  const [form, setForm] = useState({
    title:       '',
    description: '',
    content:     '',
    category:    '',
    track:       isMentor ? (user?.expertise || '') : '',
    duration:    '',
    tags:        '',
    orderIndex:  0,
  });
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('file', file);

      await api.post('/modules', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        isMentor
          ? 'Module submitted for admin approval!'
          : 'Module created successfully!'
      );
      navigate(backPath);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create module.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={header}>
          <button style={backBtn} onClick={() => navigate(backPath)}>← Back</button>
          <h2 style={title}>
            {isMentor ? 'Submit New Module for Approval' : 'Create New Module'}
          </h2>
        </div>

        {/* Mentor notice */}
        {isMentor && (
          <div style={noticeBox}>
            ℹ️ Your module will be reviewed by the admin before it becomes visible to learners.
            You will receive an email once it is approved or rejected.
          </div>
        )}

        <form onSubmit={submit} style={formStyle}>
          <div style={row}>
            <div style={field}>
              <label style={label}>Title *</label>
              <input
                style={input}
                name="title"
                value={form.title}
                onChange={change}
                required
                placeholder="e.g. Introduction to Web Development"
              />
            </div>
            <div style={field}>
              <label style={label}>Track *</label>
              <select style={input} name="track" value={form.track} onChange={change} required>
                <option value="">Select a track</option>
                {['Software Development','Data Science','Entrepreneurship','Design','Business','General'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              {isMentor && (
                <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Your expertise: <strong>{user?.expertise || 'not set'}</strong> — pick the closest track
                </span>
              )}
            </div>
          </div>

          <div style={fieldFull}>
            <label style={label}>Description *</label>
            <textarea
              style={{ ...input, height: 80, resize: 'vertical' }}
              name="description"
              value={form.description}
              onChange={change}
              required
              placeholder="Short description shown on the module card"
            />
          </div>

          <div style={fieldFull}>
            <label style={label}>Content *</label>
            <textarea
              style={{ ...input, height: 320, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
              name="content"
              value={form.content}
              onChange={change}
              required
              placeholder={'Use markdown-style formatting:\n# Heading\n## Sub-heading\n- Bullet point\n\nRegular paragraph text'}
            />
          </div>

          <div style={row}>
            <div style={field}>
              <label style={label}>Category</label>
              <input
                style={input}
                name="category"
                value={form.category}
                onChange={change}
                placeholder="e.g. Fundamentals"
              />
            </div>
            <div style={field}>
              <label style={label}>Duration (minutes)</label>
              <input
                style={input}
                name="duration"
                type="number"
                value={form.duration}
                onChange={change}
                placeholder="e.g. 45"
              />
            </div>
            {!isMentor && (
              <div style={field}>
                <label style={label}>Order Index</label>
                <input
                  style={input}
                  name="orderIndex"
                  type="number"
                  value={form.orderIndex}
                  onChange={change}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <div style={fieldFull}>
            <label style={label}>Tags (comma separated)</label>
            <input
              style={input}
              name="tags"
              value={form.tags}
              onChange={change}
              placeholder="e.g. html, css, beginner"
            />
          </div>

          <div style={fieldFull}>
            <label style={label}>Attach File (PDF, video, ZIP — max 200MB)</label>
            <input
              style={{ ...input, padding: '8px 12px' }}
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <div style={actions}>
            <button type="button" style={cancelBtn} onClick={() => navigate(backPath)}>
              Cancel
            </button>
            <button type="submit" style={isMentor ? mentorSubmitBtn : submitBtn} disabled={loading}>
              {loading
                ? (isMentor ? 'Submitting...' : 'Creating...')
                : (isMentor ? 'Submit for Approval' : 'Create Module')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const page         = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: '32px 24px' };
const card         = { background: '#fff', borderRadius: 16, padding: 40, maxWidth: 860, margin: '0 auto', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' };
const header       = { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 };
const backBtn      = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 };
const title        = { margin: 0, color: '#1e3a5f', fontSize: 22, fontWeight: 700 };
const noticeBox    = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1e40af', lineHeight: 1.6, marginBottom: 24 };
const formStyle    = { display: 'flex', flexDirection: 'column', gap: 20 };
const row          = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
const field        = { display: 'flex', flexDirection: 'column', gap: 6 };
const fieldFull    = { display: 'flex', flexDirection: 'column', gap: 6 };
const label        = { fontSize: 13, fontWeight: 600, color: '#374151' };
const input        = { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' };
const actions      = { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 };
const submitBtn    = { padding: '12px 32px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const mentorSubmitBtn = { padding: '12px 32px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const cancelBtn    = { padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 };