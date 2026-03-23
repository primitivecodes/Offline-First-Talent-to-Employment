import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const CertificatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert]     = useState(null);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef(null);

  useEffect(() => { fetchCert(); }, [id]);

  const fetchCert = async () => {
    try {
      const { data } = await api.get(`/certificates/${id}`);
      setCert(data.certificate);
      setLearner(data.learner);
    } catch {
      toast.error('Certificate not found.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const shareUrl = `${window.location.origin}/verify/${cert?.verificationCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
  };

  if (loading) return <div style={loadPage}><div style={spin} /></div>;
  if (!cert)   return null;

  const issued = new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={page}>
      {/* Actions bar */}
      <div style={actBar} className="no-print">
        <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={secBtn} onClick={copyLink}>🔗 Copy Share Link</button>
          <a href={`/api/certificates/${id}/pdf`} download style={{ ...priBtn, textDecoration: 'none', display: 'inline-block' }}>⬇ Download PDF</a>
          <button style={{ ...priBtn, background: '#334155' }} onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>

      {/* Certificate */}
      <div style={certWrap} ref={certRef}>
        <div style={certCard}>
          {/* Top border decoration */}
          <div style={topBorder} />

          {/* Header */}
          <div style={certHeader}>
            <div style={logoCircle}>🎓</div>
            <div>
              <h1 style={orgName}>ALU Talent Platform</h1>
              <p style={orgSub}>African Leadership University · Talent-to-Employment Initiative</p>
            </div>
          </div>

          {/* Title */}
          <div style={certTitleRow}>
            <div style={titleLine} />
            <span style={certTitleText}>CERTIFICATE OF COMPLETION</span>
            <div style={titleLine} />
          </div>

          {/* Body */}
          <p style={bodyText}>This certifies that</p>
          <h2 style={learnerName}>{learner?.name || 'Graduate'}</h2>
          <p style={bodyText}>has successfully completed the course</p>
          <h3 style={skillArea}>{cert.skillArea}</h3>
          <p style={bodyText}>
            demonstrating the required knowledge and skills as assessed on the ALU Talent Platform.
          </p>

          {/* Stats row */}
          <div style={statsRow}>
            <StatBox label="Issued"     value={issued} />
            <StatBox label="Certificate ID" value={cert.verificationCode} mono />
            <StatBox label="Status"     value={cert.isValid ? '✓ Valid' : 'Revoked'} green={cert.isValid} />
          </div>

          {/* Signatures */}
          <div style={sigRow}>
            <div style={sigBox}>
              <div style={sigLine} />
              <p style={sigName}>Premier Ufitinema</p>
              <p style={sigTitle}>Platform Director</p>
            </div>
            <div style={sealBox}>
              <div style={seal}>ALU<br/>TALENT</div>
            </div>
            <div style={sigBox}>
              <div style={sigLine} />
              <p style={sigName}>African Leadership University</p>
              <p style={sigTitle}>Issuing Institution</p>
            </div>
          </div>

          {/* Verification */}
          <p style={verifyText}>
            Verify this certificate at: <strong>{shareUrl}</strong>
          </p>

          {/* Bottom border */}
          <div style={bottomBorder} />
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
};

// ── Certificate verification page (public) ─────────────
export const VerifyCertificate = () => {
  const { code } = useParams();
  const [cert, setCert] = useState(null);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/certificates/verify/${code}`)
      .then(({ data }) => { setCert(data.certificate); setLearner(data.learner); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <div style={loadPage}><div style={spin} /></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {notFound ? (
          <>
            <div style={{ fontSize: 48 }}>❌</div>
            <h2 style={{ color: '#dc2626' }}>Certificate Not Found</h2>
            <p style={{ color: '#64748b' }}>The verification code <strong>{code}</strong> does not match any certificate in our records.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ color: '#065f46' }}>Certificate Verified</h2>
            <p style={{ color: '#64748b' }}>This is an authentic certificate issued by the ALU Talent Platform.</p>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, margin: '20px 0', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                <Row label="Learner"    value={learner?.name} />
                <Row label="Skill Area" value={cert?.skillArea} />
                <Row label="Issued"     value={new Date(cert?.issuedAt).toLocaleDateString()} />
                <Row label="Code"       value={cert?.verificationCode} />
                <Row label="Status"     value={cert?.isValid ? '✓ Valid' : 'Revoked'} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{value}</span>
  </div>
);

const StatBox = ({ label, value, mono, green }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontWeight: 700, fontSize: 14, color: green ? '#065f46' : '#1e3a5f', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
  </div>
);

// ── Styles ─────────────────────────────────────────────
const page      = { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' };
const loadPage  = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const spin      = { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' };
const actBar    = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const backBtn   = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const priBtn    = { padding: '9px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const secBtn    = { padding: '9px 20px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const certWrap  = { display: 'flex', justifyContent: 'center', padding: '40px 20px' };
const certCard  = { background: '#fff', width: '100%', maxWidth: 860, borderRadius: 4, boxShadow: '0 8px 48px rgba(0,0,0,0.12)', position: 'relative', overflow: 'hidden', padding: '60px 72px' };
const topBorder = { position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: 'linear-gradient(90deg, #1e3a5f, #1d4ed8, #065f46)' };
const bottomBorder = { position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'linear-gradient(90deg, #065f46, #1d4ed8, #1e3a5f)' };
const certHeader = { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 };
const logoCircle = { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0 };
const orgName   = { margin: 0, fontSize: 22, fontWeight: 800, color: '#1e3a5f' };
const orgSub    = { margin: '2px 0 0', fontSize: 13, color: '#64748b' };
const certTitleRow = { display: 'flex', alignItems: 'center', gap: 16, margin: '0 0 36px' };
const titleLine = { flex: 1, height: 1, background: '#e2e8f0' };
const certTitleText = { fontSize: 13, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.15em', whiteSpace: 'nowrap' };
const bodyText  = { textAlign: 'center', color: '#64748b', fontSize: 15, margin: '0 0 8px' };
const learnerName = { textAlign: 'center', fontSize: 36, fontWeight: 800, color: '#1e3a5f', margin: '0 0 12px', fontFamily: 'Georgia, serif' };
const skillArea = { textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#1d4ed8', margin: '0 0 16px', fontStyle: 'italic' };
const statsRow  = { display: 'flex', justifyContent: 'space-around', background: '#f8fafc', borderRadius: 12, padding: '18px 24px', margin: '32px 0' };
const sigRow    = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '36px 0 28px' };
const sigBox    = { textAlign: 'center', flex: 1 };
const sigLine   = { height: 1, background: '#334155', margin: '0 20px 8px' };
const sigName   = { margin: '0 0 2px', fontWeight: 700, color: '#1e3a5f', fontSize: 13 };
const sigTitle  = { margin: 0, color: '#94a3b8', fontSize: 11 };
const sealBox   = { display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 0.8 };
const seal      = { width: 90, height: 90, borderRadius: '50%', border: '4px solid #1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#1e3a5f', textAlign: 'center', lineHeight: 1.4, letterSpacing: '0.05em' };
const verifyText = { textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '8px 0 0' };
