import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useServiceWorker } from './hooks/useServiceWorker';
import { Register, Login } from './pages/Auth';
import { LearnerDashboard } from './pages/LearnerDashboard';
import { EmployerDashboard, MentorDashboard, AdminDashboard } from './pages/Dashboards';
import { ModulePage } from './pages/ModulePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { CertificatePage, VerifyCertificate } from './pages/CertificatePage';
import { MyCertificates } from './pages/MyCertificates';
import { PortfolioPage } from './pages/PortfolioPage';
import { MessagesPage } from './pages/MessagesPage';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import { AdminModuleForm } from './pages/AdminModuleForm';
import { AdminAssessmentForm } from './pages/AdminAssessmentForm';
import { AdminSubmissions } from './pages/AdminSubmissions';
import { PaymentHistory } from './pages/PaymentHistory';
import { NotFound } from './pages/NotFound';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={splash}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppInner() {
  // useServiceWorker();
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Landing />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/register"          element={<Register />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/verify/:code"      element={<VerifyCertificate />} />

        {/* Learner */}
        <Route path="/dashboard/learner"    element={<ProtectedRoute roles={['learner']}><LearnerDashboard /></ProtectedRoute>} />
        <Route path="/modules/:id"          element={<ProtectedRoute roles={['learner','mentor','admin']}><ModulePage /></ProtectedRoute>} />
        <Route path="/assessment/:id"       element={<ProtectedRoute roles={['learner']}><AssessmentPage /></ProtectedRoute>} />
        <Route path="/certificate/:id"      element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
        <Route path="/my-certificates"      element={<ProtectedRoute roles={['learner']}><MyCertificates /></ProtectedRoute>} />
        <Route path="/payments"             element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
        <Route path="/messages"             element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/portfolio/:learnerId" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />

        {/* Role dashboards */}
        <Route path="/dashboard/mentor"     element={<ProtectedRoute roles={['mentor']}><MentorDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/admin"      element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/employer"   element={<ProtectedRoute roles={['employer']}><EmployerDashboard /></ProtectedRoute>} />

        {/* Admin tools */}
       <Route path="/admin/modules/new"     element={<ProtectedRoute roles={['admin','mentor']}><AdminModuleForm /></ProtectedRoute>} />
        <Route path="/admin/assessments/new" element={<ProtectedRoute roles={['admin']}><AdminAssessmentForm /></ProtectedRoute>} />
        <Route path="/admin/submissions"     element={<ProtectedRoute roles={['admin']}><AdminSubmissions /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;

const Landing = () => (
  <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff' }}>
    <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontWeight: 800, fontSize: 16, color: '#1e3a5f' }}>🎓 ALU Talent Platform</span>
      <div style={{ display: 'flex', gap: 12 }}>
        <a href="/login"    style={{ padding: '8px 18px', color: '#1e3a5f', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>Log In</a>
        <a href="/register" style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>Get Started</a>
      </div>
    </nav>

    <div style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)', color: '#fff', textAlign: 'center', padding: '100px 24px 80px' }}>
      <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 18px', maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.2 }}>
        Offline-First Talent-to-Employment Platform
      </h1>
      <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
        Connecting Africa's youth with skills, mentorship, and opportunity — even without internet.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/register" style={{ padding: '14px 32px', background: '#ffd100', color: '#1a1a1a', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>Get Started Free</a>
        <a href="/login"    style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 15, border: '1px solid rgba(255,255,255,0.3)' }}>Log In</a>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, padding: '72px 48px', maxWidth: 1100, margin: '0 auto' }}>
      {[
        { icon: '📚', title: 'Learn Offline', desc: 'Download courses and study without internet. Sync progress when you reconnect.' },
        { icon: '🧑‍🏫', title: 'Expert Mentors', desc: 'Get feedback and guidance from verified industry professionals.' },
        { icon: '🏆', title: 'Earn Certificates', desc: 'Build a verified portfolio that employers can trust and check online.' },
        { icon: '💼', title: 'Find Jobs', desc: 'Connect directly with verified employers looking for your skills.' },
      ].map(f => (
        <div key={f.title} style={{ background: '#f8fafc', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
          <h3 style={{ color: '#1e3a5f', margin: '0 0 8px' }}>{f.title}</h3>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
        </div>
      ))}
    </div>

    <div style={{ background: '#f8fafc', padding: '72px 24px' }}>
      <h2 style={{ color: '#1e3a5f', textAlign: 'center', marginBottom: 32 }}>Simple Pricing</h2>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { role: 'Learner', price: '$10', period: 'one-time', color: '#1d4ed8', border: '1.5px solid #e2e8f0', desc: 'Paid via MTN MoMo when you open your first course', features: ['All courses & offline access','Mentor feedback','Verified certificates','Public portfolio'], href: '/register', btn: 'Start Learning' },
          { role: 'Employer', price: '$20', period: '/month', color: '#6d28d9', border: '2px solid #6d28d9', desc: 'MTN Mobile Money · Cancel anytime', features: ['Browse verified portfolios','View all certificates','Message graduates','Talent search filters'], href: '/register', btn: 'Find Talent' },
        ].map(p => (
          <div key={p.role} style={{ background: '#fff', borderRadius: 16, padding: 36, width: 300, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: p.border, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ color: p.color, margin: 0 }}>{p.role}</h3>
            <div style={{ fontSize: 36, fontWeight: 800, color: p.color }}>{p.price} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>{p.period}</span></div>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{p.desc}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#475569', flex: 1 }}>
              {p.features.map(f => <li key={f}>✓ {f}</li>)}
            </ul>
            <a href={p.href} style={{ padding: '14px 32px', background: p.color, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>{p.btn}</a>
          </div>
        ))}
      </div>
    </div>

    <div style={{ background: '#1e3a5f', color: '#fff', textAlign: 'center', padding: '40px 24px' }}>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
        © 2025 ALU Talent Platform · Built by Premier Ufitinema · African Leadership University
      </p>
    </div>
  </div>
);

const splash = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'Inter, sans-serif' };
