import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MomoPaymentModal } from '../components/MomoPaymentModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════════
// EMPLOYER DASHBOARD
// ══════════════════════════════════════════════════════
export const EmployerDashboard = () => {
  const { user, logout, refreshUser } = useAuth();
  const [portfolios, setPortfolios]   = useState([]);
  const [learnerMap, setLearnerMap]   = useState({});
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterTrack, setFilterTrack] = useState('');
  const [filterCert,  setFilterCert]  = useState(false);

  const isSubscribed =
    user.subscriptionStatus === 'active' &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date();

  const loadPortfolios = async () => {
    if (!isSubscribed) return;
    setLoadingPortfolios(true);
    try {
      const params = new URLSearchParams();
      if (filterTrack) params.set('track', filterTrack);
      if (filterCert)  params.set('hasCertificate', 'true');
      if (search)      params.set('search', search);
      const { data } = await api.get(`/portfolios?${params.toString()}`);
      setPortfolios(data.portfolios);
      const names = {};
      (data.portfolios || []).forEach(p => { if (p.learner) names[p.learnerId] = p.learner; });
      setLearnerMap(names);
    } catch { toast.error('Could not load portfolios.'); }
    finally { setLoadingPortfolios(false); }
  };

  const filteredPortfolios = search
    ? portfolios.filter(p => {
        const l = learnerMap[p.learnerId];
        if (!l) return true;
        return l.name?.toLowerCase().includes(search.toLowerCase()) ||
               l.expertise?.toLowerCase().includes(search.toLowerCase());
      })
    : portfolios;

  useEffect(() => { loadPortfolios(); }, [isSubscribed, filterTrack, filterCert]);

  const afterPayment = async () => {
    await refreshUser();
    setShowPayment(false);
    loadPortfolios();
  };

  return (
    <div style={page}>
      <aside style={{ ...sidebar, background: '#4c1d95' }}>
        <div style={logo}>💼 Employer</div>
        <div style={{ flex: 1 }} />
        <button style={logoutBtn} onClick={logout}>Log out</button>
      </aside>

      <main style={main}>
        <h2 style={{ color: '#1e3a5f', margin: '0 0 6px' }}>Welcome, {user.organisation || user.name}</h2>

        {!isSubscribed ? (
          <div style={payWall}>
            <div style={{ fontSize: 48 }}>🔒</div>
            <h3 style={{ color: '#1e3a5f', margin: '12px 0 6px' }}>Subscription Required</h3>
            <p style={{ color: '#64748b', maxWidth: 380, margin: '0 auto 20px' }}>
              Subscribe for <strong>$20/month via MTN Mobile Money</strong> to browse verified graduate talent profiles.
            </p>
            <button style={subBtn} onClick={() => setShowPayment(true)}>Subscribe Now — $20/month</button>
          </div>
        ) : (
          <>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 13 }}>
              Subscription active until{' '}
              <strong>{new Date(user.subscriptionExpiresAt).toLocaleDateString()}</strong>
              {' · '}
              <button style={renewLink} onClick={() => setShowPayment(true)}>Renew early</button>
            </p>

            <div style={searchRow}>
              <input style={searchInput} placeholder="Search by name or expertise..." value={search} onChange={e => setSearch(e.target.value)} />
              <select style={filterSelect} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
                <option value="">All Tracks</option>
                {['Software Development','Data Science','Entrepreneurship','Design','Business','General'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
              <label style={certFilterLabel}>
                <input type="checkbox" checked={filterCert} onChange={e => setFilterCert(e.target.checked)} style={{ marginRight: 6 }} />
                Has Certificate
              </label>
            </div>

            <h3 style={{ color: '#1e3a5f', margin: '0 0 16px' }}>
              {filteredPortfolios.length} talent profile{filteredPortfolios.length !== 1 ? 's' : ''}
              {(search || filterTrack || filterCert) && ' (filtered)'}
            </h3>

            <div style={grid}>
              {loadingPortfolios
                ? <p style={{ color: '#94a3b8' }}>Loading talent profiles...</p>
                : filteredPortfolios.length === 0
                  ? <p style={{ color: '#94a3b8' }}>No profiles match your filters.</p>
                  : filteredPortfolios.map((p) => {
                      const learner = learnerMap[p.learnerId];
                      return (
                        <div key={p.id} style={talentCard} onClick={() => window.location.href = `/portfolio/${p.learnerId}`}>
                          <div style={avatar}>{(learner?.name || 'L')[0].toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ color: '#1e3a5f' }}>{learner?.name || 'Graduate'}</strong>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {learner?.expertise || learner?.learningPath || p.bio || 'No bio yet.'}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                              {learner?.country || ''}{learner?.country ? ' · ' : ''}
                              {learner?.skillLevel || ''}{learner?.skillLevel ? ' · ' : ''}
                              👁 {p.views} views
                            </p>
                          </div>
                        </div>
                      );
                    })
              }
            </div>
          </>
        )}
      </main>

      {showPayment && (
        <MomoPaymentModal type="employer" onSuccess={afterPayment} onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════
// MENTOR DASHBOARD
// ══════════════════════════════════════════════════════
export const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [modules,     setModules]     = useState([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [tab,         setTab]         = useState('modules');

  const loadSubmissions = () => {
    Promise.all([
      api.get('/submissions?status=under_review'),
      api.get('/submissions?status=submitted'),
    ]).then(([ur, sub]) => {
      const all = [...(ur.data.submissions || []), ...(sub.data.submissions || [])];
      const seen = new Set();
      setSubmissions(all.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      }));
    }).catch(() => {});
  };

  const loadModules = async () => {
    setLoadingMods(true);
    try {
      const { data } = await api.get('/modules');
      const all = data.modules || [];
      const expertise = (user.expertise || '').toLowerCase();
      const matched = expertise
        ? all.filter(m => {
            const track = (m.track || '').toLowerCase();
            return track.includes(expertise) || expertise.includes(track);
          })
        : all;
      setModules(matched);
    } catch {
      toast.error('Could not load modules.');
    } finally {
      setLoadingMods(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
    loadModules();
  }, []);

  const submitFeedback = async (subId, content, rating) => {
    try {
      await api.post(`/submissions/${subId}/feedback`, { content, rating });
      toast.success('Feedback submitted.');
      loadSubmissions();
    } catch { toast.error('Could not submit feedback.'); }
  };

  return (
    <div style={page}>
      <aside style={{ ...sidebar, background: '#065f46' }}>
        <div style={logo}>🧑‍🏫 Mentor</div>
        <nav style={nav}>
          {['modules', 'submissions', 'sessions', 'messages'].map((t) => (
            <button
              key={t}
              style={tab === t ? { ...navBtn, ...navBtnActiveGreen } : { ...navBtn, color: '#a7f3d0' }}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'submissions' && submissions.length > 0 && (
                <span style={badge}>{submissions.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button style={logoutBtn} onClick={logout}>Log out</button>
      </aside>

      <main style={main}>
        <h2 style={{ color: '#1e3a5f', margin: '0 0 4px' }}>Hi, {user.name} 👋</h2>
        <p style={{ color: '#64748b', marginBottom: 28, fontSize: 13 }}>
          Expertise: <strong>{user.expertise || 'Not set'}</strong>
        </p>

        {/* ── MODULES TAB ─────────────────────────── */}
        {tab === 'modules' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#1e3a5f', margin: 0 }}>
                Your Courses
                <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                  — modules matching your expertise
                </span>
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{ padding: '8px 18px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                  onClick={() => window.location.href = '/admin/modules/new'}
                >
                  + Submit New Module
                </button>
                <button
                  style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                  onClick={() => window.location.href = '/admin/assessments/new'}
                >
                  + Create Assessment
                </button>
              </div>
            </div>

            {loadingMods && <p style={{ color: '#94a3b8' }}>Loading modules...</p>}

            {!loadingMods && modules.length === 0 && (
              <div style={emptyBox}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                <p style={{ color: '#64748b', margin: 0 }}>
                  No modules found matching your expertise (<strong>{user.expertise || 'not set'}</strong>).
                </p>
                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                  Submit a new module using the button above, or update your expertise in your profile.
                </p>
              </div>
            )}

            <div style={modGrid}>
              {modules.map((m) => (
                <div key={m.id} style={modCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={trackPill}>{m.track || 'General'}</span>
                    {m.approvalStatus === 'pending'
                      ? <span style={pendingPill}>Pending Approval</span>
                      : m.isPublished
                        ? <span style={publishedPill}>Published</span>
                        : <span style={draftPill}>Draft</span>
                    }
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: '#1e3a5f', fontSize: 15 }}>{m.title}</h4>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    {m.description?.slice(0, 100)}{m.description?.length > 100 ? '...' : ''}
                  </p>
                  {m.approvalStatus === 'rejected' && m.rejectionReason && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
                      ✗ Rejected: {m.rejectionReason}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                    {m.duration && <span>⏱ {m.duration} min</span>}
                    {m.category && <span>📂 {m.category}</span>}
                  </div>
                  <button
                    style={viewBtn}
                    onClick={() => window.location.href = `/modules/${m.id}`}
                  >
                    View Module →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUBMISSIONS TAB ─────────────────────── */}
        {tab === 'submissions' && (
          <div>
            <h3 style={{ color: '#1e3a5f', marginBottom: 20 }}>
              Pending Reviews ({submissions.length})
            </h3>
            {submissions.length === 0 && (
              <div style={emptyBox}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ color: '#64748b', margin: 0 }}>No submissions to review right now.</p>
              </div>
            )}
            {submissions.map((s) => (
              <FeedbackCard key={s.id} submission={s} onSubmit={submitFeedback} />
            ))}
          </div>
        )}

        {/* ── SESSIONS TAB ────────────────────────── */}
        {tab === 'sessions' && <MentorSessions mentorId={user.id} />}

        {/* ── MESSAGES TAB ────────────────────────── */}
        {tab === 'messages' && (
          <div style={{ paddingTop: 8 }}>
            <p style={{ color: '#64748b', marginBottom: 16 }}>
              Open the full messaging interface to chat with your learners.
            </p>
            <button
              style={{ padding: '12px 24px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              onClick={() => window.location.href = '/messages'}
            >
              Open Messages →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

// ── Feedback card ──────────────────────────────────────
const FeedbackCard = ({ submission, onSubmit }) => {
  const [content, setContent] = useState('');
  const [rating,  setRating]  = useState(4);

  return (
    <div style={fbCard}>
      <strong style={{ color: '#1e3a5f' }}>{submission.projectTitle}</strong>
      <small style={{ color: '#94a3b8', display: 'block', marginBottom: 8 }}>
        Submitted {new Date(submission.submittedAt).toLocaleDateString()}
      </small>
      <textarea
        style={textarea}
        placeholder="Write your feedback..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <label style={{ fontSize: 13, color: '#475569' }}>Rating:</label>
        <select
          style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0' }}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
        <button style={greenBtn} onClick={() => onSubmit(submission.id, content, rating)} disabled={!content}>
          Submit Feedback
        </button>
      </div>
    </div>
  );
};

// ── Mentor sessions ────────────────────────────────────
const MentorSessions = ({ mentorId }) => {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ learnerId: '', scheduledAt: '', durationMinutes: 60 });

  useEffect(() => {
    api.get('/sessions').then(({ data }) => setSessions(data.sessions)).catch(() => {});
  }, []);

  const schedule = async () => {
    try {
      await api.post('/sessions', form);
      toast.success('Session scheduled.');
      api.get('/sessions').then(({ data }) => setSessions(data.sessions));
    } catch { toast.error('Could not schedule.'); }
  };

  return (
    <div>
      <h3 style={{ color: '#1e3a5f', marginBottom: 16 }}>Sessions</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input style={inputSm} placeholder="Learner ID" value={form.learnerId} onChange={(e) => setForm({ ...form, learnerId: e.target.value })} />
        <input style={inputSm} type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <button style={greenBtn} onClick={schedule}>Schedule</button>
      </div>
      {sessions.length === 0 && <p style={{ color: '#94a3b8' }}>No sessions scheduled yet.</p>}
      {sessions.map((s) => (
        <div key={s.id} style={listCard}>
          <strong>{new Date(s.scheduledAt).toLocaleString()}</strong>
          <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>{s.status}</span>
        </div>
      ))}
    </div>
  );
};

// ── Pending module card (used in Admin dashboard) ──────
const PendingModuleCard = ({ module: m, onReview }) => {
  const [reason,   setReason]   = useState('');
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #fde68a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <strong style={{ color: '#1e3a5f', fontSize: 15 }}>{m.title}</strong>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            By <strong>{m.mentor?.name || 'Unknown mentor'}</strong>
            {m.mentor?.expertise && ` · Expertise: ${m.mentor.expertise}`}
            {m.track && ` · Track: ${m.track}`}
            {' · Submitted '}{new Date(m.createdAt).toLocaleDateString()}
          </div>
        </div>
        <span style={pendingPill}>Pending</span>
      </div>

      <p style={{ color: '#475569', fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>{m.description}</p>

      <button
        style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▲ Hide content preview' : '▼ Preview content'}
      </button>

      {expanded && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#334155', lineHeight: 1.7, marginBottom: 12, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {m.content || 'No content provided.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Rejection reason (required if rejecting)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          style={{ padding: '8px 20px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          onClick={() => onReview(m.id, 'approved', '')}
        >
          ✓ Approve
        </button>
        <button
          style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          onClick={() => {
            if (!reason.trim()) { toast.error('Please enter a rejection reason.'); return; }
            onReview(m.id, 'rejected', reason);
          }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════
export const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats,          setStats]          = useState(null);
  const [revenue,        setRevenue]        = useState(null);
  const [users,          setUsers]          = useState([]);
  const [pendingModules, setPendingModules] = useState([]);
  const [tab,            setTab]            = useState('overview');

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/admin/revenue').then(({ data }) => setRevenue(data)).catch(() => {});
    loadPendingModules();
  }, []);

  const loadPendingModules = async () => {
    try {
      const { data } = await api.get('/modules/pending');
      setPendingModules(data.modules || []);
    } catch {}
  };

 const reviewModule = async (id, status, reason) => {
    try {
      await api.patch(`/modules/${id}/review`, { status, reason });
      toast.success(`Module ${status === 'approved' ? 'approved and published!' : 'rejected.'}`);
      loadPendingModules();
    } catch (err) {
      console.error('Review error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Could not update module.');
    }
  };

  const loadUsers = async (role) => {
    try {
      const { data } = await api.get(`/admin/users?role=${role}`);
      setUsers(data.users);
    } catch {}
  };

  const toggleActive = async (id) => {
    await api.patch(`/admin/users/${id}/toggle-active`);
    toast.success('User status updated.');
    loadUsers('');
  };

  return (
    <div style={page}>
      <aside style={{ ...sidebar, background: '#7c2d12' }}>
        <div style={logo}>⚙️ Admin</div>
        <nav style={nav}>
          {['overview', 'users', 'modules', 'revenue'].map((t) => (
            <button
              key={t}
              style={tab === t
                ? { ...navBtn, background: 'rgba(255,255,255,0.15)', color: '#fff' }
                : { ...navBtn, color: '#fdba74' }}
              onClick={() => {
                setTab(t);
                if (t === 'users') loadUsers('');
                if (t === 'modules') loadPendingModules();
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'modules' && pendingModules.length > 0 && (
                <span style={badge}>{pendingModules.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button style={logoutBtn} onClick={logout}>Log out</button>
      </aside>

      <main style={main}>
        <h2 style={{ color: '#1e3a5f', margin: '0 0 24px' }}>Admin Dashboard</h2>

        {/* ── OVERVIEW TAB ────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <button style={qaBtn('#1d4ed8')} onClick={() => window.location.href='/admin/modules/new'}>+ New Module</button>
            <button style={qaBtn('#065f46')} onClick={() => window.location.href='/admin/assessments/new'}>+ New Assessment</button>
            <button style={qaBtn('#b45309')} onClick={() => window.location.href='/admin/submissions'}>📋 Submissions</button>
            <button style={qaBtn('#6d28d9')} onClick={() => { setTab('users'); loadUsers('learner'); }}>View Learners</button>
            <button style={qaBtn('#7c2d12')} onClick={() => setTab('revenue')}>Revenue Report</button>
          </div>
        )}

        {tab === 'overview' && stats && (
          <div style={statsGrid}>
            {[
              { label: 'Learners',      value: stats.learners,     color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Mentors',       value: stats.mentors,      color: '#065f46', bg: '#d1fae5' },
              { label: 'Employers',     value: stats.employers,    color: '#6d28d9', bg: '#ede9fe' },
              { label: 'Submissions',   value: stats.submissions,  color: '#b45309', bg: '#ffedd5' },
              { label: 'Certificates',  value: stats.certificates, color: '#0f766e', bg: '#ccfbf1' },
              { label: 'Revenue (USD)', value: revenue ? `$${revenue.totalRevenueUSD}` : '...', color: '#1e3a5f', bg: '#f1f5f9' },
            ].map((s) => (
              <div key={s.label} style={{ ...statCard, background: s.bg }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── USERS TAB ───────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['', 'learner', 'mentor', 'employer', 'admin'].map((r) => (
                <button key={r} style={filterBtn} onClick={() => loadUsers(r)}>{r || 'All'}</button>
              ))}
            </div>
            {users.length === 0 && <p style={{ color: '#94a3b8' }}>No users found.</p>}
            {users.map((u) => (
              <div key={u.id} style={userRow}>
                <div>
                  <strong style={{ color: '#1e3a5f' }}>{u.name}</strong>
                  <span style={rolePill(u.role)}>{u.role}</span>
                  {!u.isActive && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                      PENDING APPROVAL
                    </span>
                  )}
                  <small style={{ color: '#94a3b8', display: 'block' }}>{u.email}</small>
                  {u.expertise && (
                    <small style={{ color: '#065f46', display: 'block' }}>Expertise: {u.expertise}</small>
                  )}
                </div>
                <button style={u.isActive ? dangerBtn : greenBtn} onClick={() => toggleActive(u.id)}>
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── MODULES TAB ─────────────────────────── */}
        {tab === 'modules' && (
          <div>
            <h3 style={{ color: '#1e3a5f', marginBottom: 20 }}>
              Pending Module Approvals
              <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                — modules submitted by mentors waiting for your review
              </span>
            </h3>
            {pendingModules.length === 0 && (
              <div style={emptyBox}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ color: '#64748b', margin: 0 }}>No modules waiting for approval.</p>
              </div>
            )}
            {pendingModules.map((m) => (
              <PendingModuleCard key={m.id} module={m} onReview={reviewModule} />
            ))}
          </div>
        )}

        {/* ── REVENUE TAB ─────────────────────────── */}
        {tab === 'revenue' && revenue && (
          <div>
            <h3 style={{ color: '#1e3a5f' }}>Revenue Summary</h3>
            <div style={statsGrid}>
              <div style={{ ...statCard, background: '#f0fdf4' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#065f46' }}>${revenue.totalRevenueUSD}</div>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Total Revenue (USD)</div>
              </div>
              <div style={{ ...statCard, background: '#eff6ff' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1d4ed8' }}>${revenue.learnerAccessRevenue}</div>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Learner Access Fees</div>
              </div>
              <div style={{ ...statCard, background: '#fdf4ff' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#7e22ce' }}>${revenue.employerSubscriptionRevenue}</div>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Employer Subscriptions</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ── Shared styles ──────────────────────────────────────
const page      = { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8fafc' };
const sidebar   = { width: 220, display: 'flex', flexDirection: 'column', padding: '24px 16px' };
const logo      = { color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 32 };
const nav       = { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 };
const navBtn    = { background: 'transparent', border: 'none', padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', fontWeight: 500, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const navBtnActiveGreen = { background: 'rgba(255,255,255,0.15)', color: '#fff' };
const logoutBtn = { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 };
const main      = { flex: 1, padding: 32, overflowY: 'auto' };
const grid      = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 };
const modGrid   = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 };
const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 };
const statCard  = { borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const modCard   = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' };
const talentCard = { background: '#fff', borderRadius: 12, padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const avatar    = { width: 44, height: 44, borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 };
const payWall   = { textAlign: 'center', padding: '60px 20px', maxWidth: 480, margin: '0 auto' };
const subBtn    = { padding: '14px 32px', background: '#ffd100', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 };
const renewLink = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' };
const fbCard    = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const textarea  = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };
const greenBtn  = { padding: '8px 18px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const dangerBtn = { padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const viewBtn   = { padding: '8px 16px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginTop: 'auto' };
const inputSm   = { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const listCard  = { background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const userRow   = { background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const filterBtn = { padding: '7px 16px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const rolePill  = (r) => ({ marginLeft: 8, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: r === 'admin' ? '#fee2e2' : r === 'employer' ? '#ede9fe' : r === 'mentor' ? '#d1fae5' : '#dbeafe', color: r === 'admin' ? '#991b1b' : r === 'employer' ? '#6d28d9' : r === 'mentor' ? '#065f46' : '#1d4ed8' });
const qaBtn     = (bg) => ({ padding: '10px 20px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 });
const badge     = { background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '2px 7px', marginLeft: 6 };
const emptyBox  = { background: '#f8fafc', borderRadius: 12, padding: '40px 24px', textAlign: 'center', border: '1px dashed #e2e8f0' };
const trackPill     = { background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const publishedPill = { background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const pendingPill   = { background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const draftPill     = { background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const searchRow       = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' };
const searchInput     = { flex: 2, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif', minWidth: 200 };
const filterSelect    = { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif' };
const certFilterLabel = { display: 'flex', alignItems: 'center', fontSize: 13, color: '#475569', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };