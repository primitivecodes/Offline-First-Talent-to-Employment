import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const home = user
    ? { learner: '/dashboard/learner', mentor: '/dashboard/mentor', admin: '/dashboard/admin', employer: '/dashboard/employer' }[user.role] || '/'
    : '/';

  return (
    <div style={page}>
      <div style={card}>
        <div style={code404}>404</div>
        <h2 style={title}>Page Not Found</h2>
        <p style={sub}>
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <div style={btnRow}>
          <button style={secBtn} onClick={() => navigate(-1)}>← Go Back</button>
          <button style={priBtn} onClick={() => navigate(home)}>Go Home</button>
        </div>
      </div>
    </div>
  );
};

const page   = { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 20 };
const card   = { background: '#fff', borderRadius: 20, padding: '56px 48px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' };
const code404 = { fontSize: 80, fontWeight: 900, color: '#e2e8f0', lineHeight: 1, marginBottom: 16 };
const title  = { margin: '0 0 12px', fontSize: 26, fontWeight: 800, color: '#1e3a5f' };
const sub    = { color: '#64748b', lineHeight: 1.6, margin: '0 0 32px' };
const btnRow = { display: 'flex', gap: 12, justifyContent: 'center' };
const priBtn = { padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const secBtn = { padding: '12px 28px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 };
