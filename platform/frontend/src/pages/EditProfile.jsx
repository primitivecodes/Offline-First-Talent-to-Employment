import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TRACKS = ['Software Development', 'Data Science', 'Entrepreneurship', 'Design', 'Business', 'General'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const SKILL_OPTIONS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'HTML/CSS',
  'Data Analysis', 'Machine Learning', 'UI/UX Design', 'Project Management',
  'Marketing', 'Finance', 'Public Speaking', 'Leadership',
];

export const EditProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [form, setForm] = useState({
    name:         '',
    bio:          '',
    country:      '',
    phone:        '',
    learningPath: '',
    skillLevel:   '',
    expertise:    '',
  });
  const [skills,    setSkills]    = useState([]);
  const [portfolio, setPortfolio] = useState({ visibility: 'public', githubUrl: '', linkedinUrl: '' });
  const [photo,     setPhoto]     = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (!user) return;
    setForm({
      name:         user.name         || '',
      bio:          user.bio          || '',
      country:      user.country      || '',
      phone:        user.phone        || '',
      learningPath: user.learningPath || '',
      skillLevel:   user.skillLevel   || '',
      expertise:    user.expertise    || '',
    });
    setPreview(user.profilePhoto || null);

    // Load portfolio data
    api.get(`/portfolios/${user.id}`)
      .then(({ data }) => {
        const p = data.portfolio;
        setPortfolio({
          visibility: p.visibility || 'public',
          githubUrl:  p.githubUrl  || '',
          linkedinUrl: p.linkedinUrl || '',
        });
        const parsed = p.skills ? JSON.parse(p.skills) : [];
        setSkills(parsed);
      })
      .catch(() => {});
  }, [user]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const changePortfolio = (e) => setPortfolio({ ...portfolio, [e.target.name]: e.target.value });

  const toggleSkill = (skill) => {
    setSkills(skills.includes(skill)
      ? skills.filter(s => s !== skill)
      : [...skills, skill]
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB.'); return; }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      // 1. Update profile
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      await api.patch('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      // 2. Update portfolio
      await api.patch('/portfolios/me', {
        ...portfolio,
        skills,
      });

      await refreshUser();
      toast.success('Profile saved!');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = ['personal', 'learning', 'portfolio'];

  return (
    <div style={page}>
      {/* Header */}
      <div style={header}>
        <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={title}>Edit Profile</h2>
        <button style={saveBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tab nav */}
      <div style={tabBar}>
        {tabs.map(t => (
          <button
            key={t}
            style={{ ...tabBtn, ...(activeTab === t ? tabActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {{ personal: '👤 Personal', learning: '📚 Learning', portfolio: '🗂 Portfolio' }[t]}
          </button>
        ))}
      </div>

      <div style={body}>
        {/* ── PERSONAL TAB ─────────────────────────────── */}
        {activeTab === 'personal' && (
          <div style={section}>
            {/* Photo */}
            <div style={photoRow}>
              <div style={photoCircle} onClick={() => fileRef.current?.click()}>
                {preview
                  ? <img src={preview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <span style={{ fontSize: 40, color: '#94a3b8' }}>👤</span>
                }
                <div style={photoOverlay}>📷</div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1e3a5f' }}>Profile Photo</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>JPG or PNG, max 5MB</p>
                <button style={photoBtn} onClick={() => fileRef.current?.click()}>Choose Photo</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>

            <div style={grid2}>
              <Field label="Full Name *">
                <input style={input} name="name" value={form.name} onChange={change} placeholder="Your full name" />
              </Field>
              <Field label="Country">
                <input style={input} name="country" value={form.country} onChange={change} placeholder="e.g. Rwanda, Kenya, Nigeria" />
              </Field>
              <Field label="Phone Number">
                <input style={input} name="phone" value={form.phone} onChange={change} placeholder="e.g. 250781234567" type="tel" />
              </Field>
            </div>

            <Field label="Bio">
              <textarea
                style={{ ...input, height: 100, resize: 'vertical' }}
                name="bio"
                value={form.bio}
                onChange={change}
                placeholder="Tell employers and mentors about yourself — your goals, interests, and background."
              />
              <small style={hint}>{form.bio.length}/500 characters</small>
            </Field>
          </div>
        )}

        {/* ── LEARNING TAB ─────────────────────────────── */}
        {activeTab === 'learning' && (
          <div style={section}>
            <div style={grid2}>
              <Field label="Learning Track">
                <select style={input} name="learningPath" value={form.learningPath} onChange={change}>
                  <option value="">Select your track</option>
                  {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Skill Level">
                <select style={input} name="skillLevel" value={form.skillLevel} onChange={change}>
                  <option value="">Select your level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Area of Expertise">
                <input style={input} name="expertise" value={form.expertise} onChange={change} placeholder="e.g. Frontend Development, Data Analysis" />
              </Field>
            </div>

            <Field label="Skills (select all that apply)">
              <div style={skillsGrid}>
                {SKILL_OPTIONS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    style={skillChip(skills.includes(skill))}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Custom skill (type and press Enter)">
              <input
                style={input}
                placeholder="e.g. Figma, Rust, Django..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    toggleSkill(e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
            </Field>

            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {skills.map(s => (
                  <span key={s} style={selectedSkill}>
                    {s}
                    <button style={removeSkill} onClick={() => toggleSkill(s)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PORTFOLIO TAB ─────────────────────────────── */}
        {activeTab === 'portfolio' && (
          <div style={section}>
            <Field label="Portfolio Visibility">
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ val: 'public', icon: '🌍', label: 'Public', desc: 'Visible to employers' },
                  { val: 'private', icon: '🔒', label: 'Private', desc: 'Only you can see it' }].map(opt => (
                  <div
                    key={opt.val}
                    style={visCard(portfolio.visibility === opt.val)}
                    onClick={() => setPortfolio({ ...portfolio, visibility: opt.val })}
                  >
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div>
                      <strong style={{ color: '#1e3a5f', fontSize: 14 }}>{opt.label}</strong>
                      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <Field label="GitHub URL">
              <input style={input} name="githubUrl" value={portfolio.githubUrl} onChange={changePortfolio} placeholder="https://github.com/yourname" type="url" />
            </Field>
            <Field label="LinkedIn URL">
              <input style={input} name="linkedinUrl" value={portfolio.linkedinUrl} onChange={changePortfolio} placeholder="https://linkedin.com/in/yourname" type="url" />
            </Field>

            <div style={infoBox}>
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af' }}>
                Certificates and approved project submissions are automatically added to your portfolio. You can manage individual items from the portfolio public page.
              </p>
            </div>
          </div>
        )}

        <div style={saveRow}>
          <button style={saveBtnLg} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
          <button style={cancelBtn} onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Small helpers ──────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={field}>
    <label style={fieldLabel}>{label}</label>
    {children}
  </div>
);

// ── Styles ─────────────────────────────────────────────
const page    = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const header  = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 };
const backBtn = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 };
const title   = { margin: 0, color: '#1e3a5f', fontSize: 18, fontWeight: 700, flex: 1 };
const saveBtn = { padding: '8px 22px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const tabBar  = { background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', padding: '0 32px' };
const tabBtn  = { padding: '14px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' };
const tabActive = { color: '#1d4ed8', borderBottom: '2px solid #1d4ed8' };
const body    = { maxWidth: 720, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 };
const section = { background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 20 };
const photoRow = { display: 'flex', gap: 24, alignItems: 'center' };
const photoCircle = { width: 90, height: 90, borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', flexShrink: 0 };
const photoOverlay = { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 12, textAlign: 'center', padding: '4px 0' };
const photoBtn = { marginTop: 8, padding: '6px 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155' };
const grid2   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const field   = { display: 'flex', flexDirection: 'column', gap: 6 };
const fieldLabel = { fontSize: 13, fontWeight: 600, color: '#475569' };
const input   = { padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };
const hint    = { fontSize: 11, color: '#94a3b8', marginTop: 4 };
const skillsGrid = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 };
const skillChip = (sel) => ({ padding: '6px 14px', background: sel ? '#1d4ed8' : '#f1f5f9', color: sel ? '#fff' : '#475569', border: `1.5px solid ${sel ? '#1d4ed8' : '#e2e8f0'}`, borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: sel ? 600 : 400 });
const selectedSkill = { background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 };
const removeSkill = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 };
const visCard = (sel) => ({ flex: 1, padding: '14px 18px', border: `2px solid ${sel ? '#1d4ed8' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', background: sel ? '#eff6ff' : '#fff' });
const infoBox = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 };
const saveRow = { display: 'flex', gap: 12 };
const saveBtnLg = { flex: 2, padding: 14, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const cancelBtn = { flex: 1, padding: 14, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#334155' };
