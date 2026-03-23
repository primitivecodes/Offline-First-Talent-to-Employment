import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MomoPaymentModal } from '../components/MomoPaymentModal';
import { GridSkeleton } from '../components/Skeletons';
import api from '../utils/api';
import { getAllCachedModules, getCachedModuleCount, getStorageEstimate } from '../utils/offlineDB';
import toast from 'react-hot-toast';

export const LearnerDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules]         = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [progress, setProgress]       = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isOffline, setIsOffline]     = useState(!navigator.onLine);
  const [cachedCount, setCachedCount] = useState(0);
  const [storageInfo, setStorageInfo] = useState(null);
  const [pendingModule, setPendingModule] = useState(null);
  const [tab, setTab] = useState('modules'); // modules | submissions | messages | sessions

  useEffect(() => {
    fetchModules();
    fetchProgress();
    loadOfflineStats();

    const goOnline  = () => { setIsOffline(false); fetchModules(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const fetchModules = async () => {
    setModulesLoading(true);
    try {
      const { data } = await api.get('/modules');
      setModules(data.modules);
    } catch {
      // Offline — fall back to IndexedDB cached modules
      try {
        const cached = await getAllCachedModules();
        if (cached?.length) {
          setModules(cached);
          toast('📥 Showing offline-cached modules.', { duration: 3000 });
        } else {
          toast('You are offline. No cached modules found.', { icon: '📴', duration: 4000 });
        }
      } catch {
        toast.error('Could not load modules.');
      }
    } finally {
      setModulesLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const { data } = await api.get(`/progress/${user.id}`);
      setProgress(data.report);
    } catch {}
  };

  const loadOfflineStats = async () => {
    try {
      const count = await getCachedModuleCount();
      setCachedCount(count);
      const storage = await getStorageEstimate();
      setStorageInfo(storage);
    } catch {}
  };

  const openModule = async (mod) => {
    if (!user.hasPaidAccess) {
      setPendingModule(mod);
      setShowPayment(true);
      return;
    }
    navigate(`/modules/${mod.id}`);
  };

  const afterPayment = async () => {
    await refreshUser();
    setShowPayment(false);
    if (pendingModule) navigate(`/modules/${pendingModule.id}`);
  };

  return (
    <div style={page}>
      {/* Sidebar */}
      <aside style={sidebar}>
        <div style={logo}>🎓 ALU Talent</div>
        <nav style={nav}>
          {['modules','submissions','messages','sessions'].map((t) => (
            <button key={t} style={tab === t ? {...navBtn, ...navBtnActive} : navBtn} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {/* Offline status widget */}
        <div style={offlineWidget}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOffline ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {isOffline ? 'Offline Mode' : 'Online'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5 }}>
            {cachedCount > 0
              ? `${cachedCount} module${cachedCount !== 1 ? 's' : ''} saved offline`
              : 'No modules saved yet'}
          </p>
          {storageInfo && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              Storage: {storageInfo.usedMB}MB / {storageInfo.totalMB}MB
            </p>
          )}
        </div>

        <button style={logoutBtn} onClick={() => window.location.href = '/edit-profile'}>✏ Edit Profile</button>
        <button style={logoutBtn} onClick={() => window.location.href = '/payments'}>💳 Payments</button>
        <button style={logoutBtn} onClick={logout}>Log out</button>
      </aside>

      {/* Main */}
      <main style={main}>
        {/* Header */}
        <div style={topBar}>
          <div>
            <h2 style={{ margin: 0, color: '#1e3a5f' }}>Hi, {user.name} 👋</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
              {user.learningPath || 'No track assigned yet'} · {user.skillLevel || 'Skill level not set'}
            </p>
          </div>
          {!user.hasPaidAccess && (
            <button style={payBadge} onClick={() => setShowPayment(true)}>
              📱 Unlock Courses — $10
            </button>
          )}
        </div>

        {/* Progress bar */}
        {progress && (
          <div style={progressCard}>
            <span style={{ fontWeight: 600, color: '#1e3a5f' }}>Overall Progress</span>
            <div style={barBg}>
              <div style={{ ...barFill, width: `${progress.completionPct}%` }} />
            </div>
            <span style={{ fontSize: 13, color: '#475569' }}>{progress.completionPct}% complete · {progress.certificatesEarned} certificate{progress.certificatesEarned !== 1 ? 's' : ''} earned</span>
          </div>
        )}

        {/* Modules Tab */}
        {tab === 'modules' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>{modules.length} module{modules.length !== 1 ? 's' : ''} available</span>
              <Link to="/my-certificates" style={{ color: '#1d4ed8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>🏆 My Certificates →</Link>
            </div>
            {modulesLoading ? <GridSkeleton count={6} /> : (
              <div style={grid}>
                {modules.length === 0 && <p style={{ color: '#94a3b8' }}>No modules available yet.</p>}
                {modules.map((mod) => (
                  <div key={mod.id} style={card}>
                    <div style={cardTop}>
                      <span style={trackTag}>{mod.track || 'General'}</span>
                      {mod.isOfflineAvailable && <span style={offlineTag}>📥 Offline</span>}
                    </div>
                    <h3 style={cardTitle}>{mod.title}</h3>
                    <p style={cardDesc}>{mod.description}</p>
                    <div style={cardMeta}>
                      {mod.duration && <span>⏱ {mod.duration} min</span>}
                      {mod.progress?.isCompleted && <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Completed</span>}
                    </div>
                    <button style={openBtn} onClick={() => openModule(mod)}>
                      {!user.hasPaidAccess ? '🔒 Unlock to open' : 'Open Module →'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'submissions' && <SubmissionsTab userId={user.id} />}
        {tab === 'messages' && (
          <div style={{ paddingTop: 20 }}>
            <p style={{ color: '#64748b', marginBottom: 16 }}>Full messaging with your mentor is available on the messages page.</p>
            <button style={{ padding: '12px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }} onClick={() => window.location.href = '/messages'}>
              Open Messages →
            </button>
          </div>
        )}
        {tab === 'sessions' && <SessionsTab />}
      </main>

      {showPayment && (
        <MomoPaymentModal
          type="learner"
          onSuccess={afterPayment}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
};

// ── Sub-tabs ───────────────────────────────────────────
const SubmissionsTab = ({ userId }) => {
  const [subs, setSubs] = useState([]);
  useEffect(() => {
    api.get('/submissions/mine').then(({ data }) => setSubs(data.submissions)).catch(() => {});
  }, []);
  return (
    <div>
      <h3 style={{ color: '#1e3a5f' }}>My Submissions</h3>
      {subs.length === 0 && <p style={{ color: '#94a3b8' }}>No submissions yet. Complete a module to submit your project.</p>}
      {subs.map((s) => (
        <div key={s.id} style={listCard}>
          <strong>{s.projectTitle}</strong>
          <span style={statusBadge(s.status)}>{s.status.replace('_', ' ')}</span>
          <small style={{ color: '#94a3b8' }}>{new Date(s.submittedAt).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
};

const MessagesTab = ({ userId }) => {
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [toId, setToId]   = useState('');
  useEffect(() => {
    // TODO: load conversations list
  }, []);
  const send = async () => {
    if (!toId || !newMsg) return;
    try {
      await api.post('/messages', { receiverId: toId, content: newMsg });
      setNewMsg('');
      toast.success('Message sent.');
    } catch { toast.error('Could not send message.'); }
  };
  return (
    <div>
      <h3 style={{ color: '#1e3a5f' }}>Messages</h3>
      <p style={{ color: '#64748b' }}>Secure messaging with your mentor.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inputSm, flex: 1 }} value={toId} onChange={(e) => setToId(e.target.value)} placeholder="Mentor ID" />
        <input style={{ ...inputSm, flex: 3 }} value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Write a message..." />
        <button style={sendBtn} onClick={send}>Send</button>
      </div>
    </div>
  );
};

const SessionsTab = () => {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    api.get('/sessions').then(({ data }) => setSessions(data.sessions)).catch(() => {});
  }, []);
  return (
    <div>
      <h3 style={{ color: '#1e3a5f' }}>Mentorship Sessions</h3>
      {sessions.length === 0 && <p style={{ color: '#94a3b8' }}>No sessions scheduled yet.</p>}
      {sessions.map((s) => (
        <div key={s.id} style={listCard}>
          <strong>{new Date(s.scheduledAt).toLocaleString()}</strong>
          <span style={statusBadge(s.status)}>{s.status}</span>
          {s.notes && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>{s.notes}</p>}
        </div>
      ))}
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const page       = { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8fafc' };
const sidebar      = { width: 220, background: '#1e3a5f', display: 'flex', flexDirection: 'column', padding: '24px 16px' };
const offlineWidget= { background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', margin: '12px 0', border: '1px solid rgba(255,255,255,0.12)' };
const logo       = { color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 32 };
const nav        = { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 };
const navBtn     = { background: 'transparent', border: 'none', color: '#94a3b8', padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const navBtnActive = { background: 'rgba(255,255,255,0.1)', color: '#fff' };
const logoutBtn  = { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
const main       = { flex: 1, padding: 32, overflowY: 'auto' };
const topBar     = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 };
const payBadge   = { background: '#ffd100', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const progressCard = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const barBg      = { height: 10, background: '#e2e8f0', borderRadius: 99 };
const barFill    = { height: '100%', background: '#1d4ed8', borderRadius: 99, transition: 'width 0.4s' };
const grid       = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 };
const card       = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 };
const cardTop    = { display: 'flex', gap: 8 };
const trackTag   = { background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 };
const offlineTag = { background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 };
const cardTitle  = { margin: 0, color: '#1e3a5f', fontSize: 15, fontWeight: 700 };
const cardDesc   = { margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 };
const cardMeta   = { display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' };
const openBtn    = { marginTop: 'auto', padding: '10px 0', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 };
const listCard   = { background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const inputSm    = { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const sendBtn    = { padding: '9px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const statusBadge = (s) => ({
  padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
  background: s === 'approved' ? '#d1fae5' : s === 'rejected' ? '#fee2e2' : '#fef3c7',
  color: s === 'approved' ? '#065f46' : s === 'rejected' ? '#991b1b' : '#92400e',
});
