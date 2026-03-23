import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const PortfolioPage = () => {
  const { learnerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [learner,   setLearner]   = useState(null);
  const [items,     setItems]     = useState([]);
  const [certs,     setCerts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msgModal,  setMsgModal]  = useState(false);
  const [message,   setMessage]   = useState('');

  useEffect(() => { fetchPortfolio(); }, [learnerId]);

  const fetchPortfolio = async () => {
    try {
      const { data } = await api.get(`/portfolios/${learnerId}`);
      setPortfolio(data.portfolio);
      setItems(data.items || []);
      // Fetch learner profile
      const { data: ud } = await api.get(`/users/${learnerId}`);
      setLearner(ud.user);
      // Fetch certificates
      const { data: cd } = await api.get(`/certificates?learnerId=${learnerId}`);
      setCerts(cd.certificates || []);
    } catch {
      toast.error('Portfolio not found.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await api.post('/messages', { receiverId: learnerId, content: message });
      toast.success('Message sent to learner.');
      setMsgModal(false);
      setMessage('');
    } catch { toast.error('Could not send message.'); }
  };

  if (loading) return <div style={loadPage}><div style={spin} /></div>;
  if (!portfolio) return null;

  const skills = portfolio.skills ? JSON.parse(portfolio.skills) : [];

  return (
    <div style={page}>
      {/* Header */}
      <div style={profileHeader}>
        <div style={avatar}>
          {learner?.profilePhoto
            ? <img src={learner.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 40, color: '#fff' }}>{(learner?.name || 'L')[0].toUpperCase()}</span>
          }
        </div>
        <div style={profileInfo}>
          <h1 style={profileName}>{learner?.name || 'Learner'}</h1>
          <p style={profileMeta}>
            {learner?.learningPath && <span>📚 {learner.learningPath}</span>}
            {learner?.skillLevel   && <span>⭐ {learner.skillLevel}</span>}
            {learner?.country      && <span>📍 {learner.country}</span>}
          </p>
          {portfolio.bio && <p style={bioText}>{portfolio.bio}</p>}
          <div style={linksRow}>
            {portfolio.githubUrl   && <a href={portfolio.githubUrl}   target="_blank" rel="noreferrer" style={extLink}>GitHub →</a>}
            {portfolio.linkedinUrl && <a href={portfolio.linkedinUrl} target="_blank" rel="noreferrer" style={extLink}>LinkedIn →</a>}
          </div>
        </div>
        {user?.role === 'employer' && (
          <button style={contactBtn} onClick={() => setMsgModal(true)}>✉ Contact Learner</button>
        )}
      </div>

      <div style={twoCol}>
        {/* Left: certificates */}
        <div style={colLeft}>
          <h3 style={secTitle}>🏆 Certificates ({certs.length})</h3>
          {certs.length === 0
            ? <p style={empty}>No certificates yet.</p>
            : certs.map((c) => (
                <div key={c.id} style={certCard}>
                  <div style={certIcon}>🎓</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#1e3a5f' }}>{c.skillArea}</strong>
                    <p style={certMeta}>Issued {new Date(c.issuedAt).toLocaleDateString()} · Code: {c.verificationCode}</p>
                    {c.isValid
                      ? <span style={validBadge}>✓ Verified</span>
                      : <span style={invalidBadge}>Revoked</span>}
                  </div>
                  <Link to={`/verify/${c.verificationCode}`} style={verifyLink}>Verify</Link>
                </div>
              ))
          }

          {/* Skills */}
          {skills.length > 0 && (
            <>
              <h3 style={{ ...secTitle, marginTop: 28 }}>🛠 Skills</h3>
              <div style={skillsGrid}>
                {skills.map((s) => <span key={s} style={skillChip}>{s}</span>)}
              </div>
            </>
          )}
        </div>

        {/* Right: projects / submissions */}
        <div style={colRight}>
          <h3 style={secTitle}>📁 Projects ({items.filter(i => i.itemType === 'submission').length})</h3>
          {items.filter((i) => i.itemType === 'submission').length === 0
            ? <p style={empty}>No projects submitted yet.</p>
            : items.filter((i) => i.itemType === 'submission').map((item) => (
                <div key={item.id} style={projectCard}>
                  <h4 style={{ margin: '0 0 6px', color: '#1e3a5f' }}>{item.title}</h4>
                  {item.description && <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{item.description}</p>}
                  <small style={{ color: '#94a3b8' }}>Added {new Date(item.addedAt).toLocaleDateString()}</small>
                </div>
              ))
          }

          {/* Stats row */}
          <div style={statsRow}>
            <Stat label="Certificates" value={certs.length} />
            <Stat label="Projects"     value={items.filter(i=>i.itemType==='submission').length} />
            <Stat label="Portfolio Views" value={portfolio.views || 0} />
          </div>
        </div>
      </div>

      {/* Message modal */}
      {msgModal && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ color: '#1e3a5f', margin: '0 0 12px' }}>Message {learner?.name}</h3>
            <textarea
              style={textarea}
              rows={5}
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={cancelBtn} onClick={() => setMsgModal(false)}>Cancel</button>
              <button style={sendBtn} onClick={sendMessage}>Send Message</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
  </div>
);

// ── Styles ─────────────────────────────────────────────
const page         = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const loadPage     = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const spin         = { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' };
const profileHeader= { background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', padding: '48px 64px', display: 'flex', gap: 32, alignItems: 'flex-start' };
const avatar       = { width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 };
const profileInfo  = { flex: 1 };
const profileName  = { margin: '0 0 8px', fontSize: 30, fontWeight: 800, color: '#fff' };
const profileMeta  = { display: 'flex', gap: 16, flexWrap: 'wrap', margin: '0 0 10px', color: 'rgba(255,255,255,0.8)', fontSize: 14 };
const bioText      = { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 560 };
const linksRow     = { display: 'flex', gap: 12 };
const extLink      = { color: '#ffd100', fontSize: 13, fontWeight: 600, textDecoration: 'none' };
const contactBtn   = { padding: '12px 24px', background: '#ffd100', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, flexShrink: 0, alignSelf: 'flex-start' };
const twoCol       = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, padding: 40, maxWidth: 1200, margin: '0 auto' };
const colLeft      = {};
const colRight     = {};
const secTitle     = { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#334155' };
const empty        = { color: '#94a3b8', fontSize: 14 };
const certCard     = { background: '#fff', borderRadius: 12, padding: 18, marginBottom: 12, display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const certIcon     = { fontSize: 28, flexShrink: 0 };
const certMeta     = { margin: '2px 0 6px', fontSize: 12, color: '#64748b' };
const validBadge   = { background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 };
const invalidBadge = { background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 };
const verifyLink   = { color: '#1d4ed8', fontSize: 12, fontWeight: 600, textDecoration: 'none', flexShrink: 0 };
const skillsGrid   = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const skillChip    = { background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99 };
const projectCard  = { background: '#fff', borderRadius: 12, padding: 18, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6 };
const statsRow     = { display: 'flex', justifyContent: 'space-around', background: '#fff', borderRadius: 12, padding: 24, marginTop: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const overlay      = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 };
const modal        = { background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%' };
const textarea     = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' };
const cancelBtn    = { flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#334155' };
const sendBtn      = { flex: 2, padding: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 };
