// ── pages/Register.jsx ────────────────────────────────
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'learner', phone: '', organisation: '', country: 'Rwanda',
  });
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(form);
      // Mentor accounts are pending approval — no token returned
      if (result?.pendingApproval) {
        toast.success('Application submitted! Wait for admin approval before logging in.', { duration: 6000 });
        navigate('/login');
        return;
      }
      toast.success(`Welcome, ${result.name}! Account created.`);
      navigate(getDashboard(result.role));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.sub}>Join the Talent-to-Employment Platform</p>

        <form onSubmit={submit} style={styles.form}>
          <input style={styles.input} name="name"     placeholder="Full name"       value={form.name}     onChange={change} required />
          <input style={styles.input} name="email"    placeholder="Email address"   value={form.email}    onChange={change} required type="email" />
          <input style={styles.input} name="phone"    placeholder="MTN phone (e.g. 250781234567)" value={form.phone} onChange={change} />
          <input style={styles.input} name="password" placeholder="Password (min 8 chars)" value={form.password} onChange={change} required type="password" minLength={8} />
          <input style={styles.input} name="confirmPassword" placeholder="Confirm password" value={form.confirmPassword} onChange={change} required type="password" />

          <select style={styles.input} name="role" value={form.role} onChange={change}>
            <option value="learner">Learner — access courses ($10 one-time via MTN MoMo)</option>
            <option value="employer">Employer — browse talent ($20/month via MTN MoMo)</option>
            <option value="mentor">Mentor — guide learners (requires admin approval)</option>
          </select>

          {form.role === 'employer' && (
            <input style={styles.input} name="organisation" placeholder="Organisation name" value={form.organisation} onChange={change} required />
          )}

          {form.role === 'mentor' && (
            <input style={styles.input} name="expertise" placeholder="Your area of expertise (e.g. Software Development)" value={form.expertise || ''} onChange={change} required />
          )}

          <input style={styles.input} name="country" placeholder="Country" value={form.country} onChange={change} />

          {form.role === 'learner' && (
            <div style={styles.notice}>
              ℹ️ You can browse freely. A one-time fee of <strong>$10 via MTN Mobile Money</strong> will be requested when you open your first course.
            </div>
          )}
         {form.role === 'employer' && (
            <div style={styles.notice}>
              ℹ️ A monthly subscription of <strong>$20 via MTN Mobile Money</strong> is required to access graduate talent profiles.
            </div>
          )}

          {form.role === 'mentor' && (
            <div style={styles.notice}>
              ℹ️ Mentor accounts require <strong>admin approval</strong> before you can log in. You will be notified once your application is reviewed.
            </div>
          )}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ color: '#1d4ed8' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

// ── pages/Login.jsx ───────────────────────────────────
export const Login = () => {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getDashboard(user.role));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.sub}>Log in to your account</p>

        <form onSubmit={submit} style={styles.form}>
          <input style={styles.input} name="email"    placeholder="Email" value={form.email}    onChange={change} required type="email" />
          <input style={styles.input} name="password" placeholder="Password" value={form.password} onChange={change} required type="password" />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748b' }}>
          No account yet? <Link to="/register" style={{ color: '#1d4ed8' }}>Register</Link>
        </p>
      </div>
    </div>
  );
};

// ── Shared helpers ────────────────────────────────────
export const getDashboard = (role) => {
  const map = { learner: '/dashboard/learner', mentor: '/dashboard/mentor', admin: '/dashboard/admin', employer: '/dashboard/employer' };
  return map[role] || '/';
};

const styles = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16 },
  card:  { background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: '#1e3a5f' },
  sub:   { color: '#64748b', marginTop: 6, marginBottom: 28 },
  form:  { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  btn:   { padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  notice:{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af', lineHeight: 1.5 },
};
