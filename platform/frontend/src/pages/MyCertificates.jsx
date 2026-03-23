import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const MyCertificates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/certificates')
      .then(({ data }) => setCerts(data.certificates))
      .catch(() => toast.error('Could not load certificates.'))
      .finally(() => setLoading(false));
  }, []);

  const shareUrl = (code) => `${window.location.origin}/verify/${code}`;

  const copyLink = (code) => {
    navigator.clipboard.writeText(shareUrl(code));
    toast.success('Share link copied!');
  };

  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={() => navigate('/dashboard/learner')}>← Dashboard</button>
        <h2 style={title}>My Certificates</h2>
      </div>

      <div style={body}>
        {loading && <p style={muted}>Loading...</p>}

        {!loading && certs.length === 0 && (
          <div style={empty}>
            <div style={{ fontSize: 56 }}>🏆</div>
            <h3 style={{ color: '#1e3a5f', margin: '16px 0 8px' }}>No certificates yet</h3>
            <p style={{ color: '#64748b', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
              Complete a module and pass its assessment to earn your first certificate.
            </p>
            <button style={priBtn} onClick={() => navigate('/dashboard/learner')}>Browse Modules</button>
          </div>
        )}

        <div style={grid}>
          {certs.map((c) => (
            <div key={c.id} style={card}>
              {/* Top stripe */}
              <div style={{ height: 6, background: 'linear-gradient(90deg,#1e3a5f,#1d4ed8)', borderRadius: '10px 10px 0 0', margin: '-24px -24px 20px' }} />

              <div style={cardTop}>
                <div style={certIcon}>🎓</div>
                <div style={{ flex: 1 }}>
                  <h3 style={certTitle}>{c.skillArea}</h3>
                  <p style={certDate}>Issued {new Date(c.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {c.isValid
                  ? <span style={validBadge}>✓ Valid</span>
                  : <span style={revokedBadge}>Revoked</span>}
              </div>

              <div style={codeRow}>
                <span style={codeLabel}>Certificate ID</span>
                <code style={code}>{c.verificationCode}</code>
              </div>

              <div style={actions}>
                <Link to={`/certificate/${c.id}`} style={viewBtn}>View</Link>
                <a href={`/api/certificates/${c.id}/pdf`} download style={{ ...viewBtn, background: '#065f46', flex: 1 }}>⬇ PDF</a>
                <button style={shareBtn} onClick={() => copyLink(c.verificationCode)}>🔗</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const page    = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const header  = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20 };
const backBtn = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 };
const title   = { margin: 0, color: '#1e3a5f', fontSize: 20, fontWeight: 700 };
const body    = { padding: '36px 40px', maxWidth: 1100, margin: '0 auto' };
const muted   = { color: '#94a3b8' };
const empty   = { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 12 };
const priBtn  = { marginTop: 8, padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const grid    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 };
const card    = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 16 };
const cardTop = { display: 'flex', gap: 14, alignItems: 'flex-start' };
const certIcon= { fontSize: 32, flexShrink: 0 };
const certTitle = { margin: 0, color: '#1e3a5f', fontSize: 16, fontWeight: 700, lineHeight: 1.3 };
const certDate  = { margin: '4px 0 0', fontSize: 12, color: '#64748b' };
const validBadge   = { background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0 };
const revokedBadge = { background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0 };
const codeRow  = { background: '#f8fafc', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const codeLabel = { fontSize: 11, color: '#94a3b8', fontWeight: 600 };
const code     = { fontSize: 13, color: '#1e3a5f', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' };
const actions  = { display: 'flex', gap: 10 };
const viewBtn  = { flex: 2, padding: '9px 0', background: '#1d4ed8', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', textAlign: 'center' };
const shareBtn = { flex: 1, padding: '9px 0', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
