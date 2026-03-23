import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Forgot Password ────────────────────────────────────
export const ForgotPassword = () => {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      // Show success even on error to prevent user enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        {!sent ? (
          <>
            <h2 style={title}>Forgot Password</h2>
            <p style={sub}>Enter your email and we will send you a reset link.</p>
            <form onSubmit={submit} style={form}>
              <input style={input} type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button style={btn} type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            <Link to="/login" style={backLink}>← Back to login</Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, textAlign: 'center' }}>📧</div>
            <h2 style={{ ...title, textAlign: 'center' }}>Check your email</h2>
            <p style={{ ...sub, textAlign: 'center' }}>
              If an account exists for <strong>{email}</strong>, we have sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link to="/login" style={{ ...btn, textDecoration: 'none', textAlign: 'center', display: 'block' }}>Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
};

// ── Reset Password ─────────────────────────────────────
export const ResetPassword = () => {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get('token');
  const [pw,  setPw]  = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error('Passwords do not match.'); return; }
    if (pw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: pw });
      setDone(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div style={page}><div style={card}><p style={{ color: '#dc2626' }}>Invalid reset link.</p><Link to="/login" style={backLink}>← Back to login</Link></div></div>
  );

  return (
    <div style={page}>
      <div style={card}>
        {!done ? (
          <>
            <h2 style={title}>Set New Password</h2>
            <p style={sub}>Choose a strong password of at least 8 characters.</p>
            <form onSubmit={submit} style={form}>
              <input style={input} type="password" placeholder="New password" value={pw}  onChange={(e) => setPw(e.target.value)}  required minLength={8} />
              <input style={input} type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
              <button style={btn} type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
            <h2 style={{ ...title, textAlign: 'center' }}>Password Updated</h2>
            <p style={{ ...sub, textAlign: 'center' }}>Redirecting you to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const page = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16, fontFamily: 'Inter, sans-serif' };
const card = { background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 16 };
const title = { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e3a5f' };
const sub   = { margin: 0, color: '#64748b', lineHeight: 1.6 };
const form  = { display: 'flex', flexDirection: 'column', gap: 12 };
const input = { padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const btn   = { padding: 13, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const backLink = { color: '#1d4ed8', fontSize: 13, textDecoration: 'none', fontWeight: 600 };
