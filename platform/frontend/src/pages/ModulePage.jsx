import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  cacheModule,
  getCachedModule,
  queueProgress,
} from '../utils/offlineDB';
import toast from 'react-hot-toast';

export const ModulePage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [module,     setModule]     = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [isCached,   setIsCached]   = useState(false);
  const [isOffline,  setIsOffline]  = useState(!navigator.onLine);
  const [syncing,    setSyncing]    = useState(false);
  const scrollRef = useRef(null);
  const syncTimer = useRef(null);

  // Track online / offline
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Load module — network with IndexedDB fallback
  useEffect(() => { loadModule(); }, [id]);

  const loadModule = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/modules/${id}`);
      setModule(data.module);
      setAssessment(data.assessment);
      setProgress(data.module?.progress?.progressPct || 0);

      // Cache to IndexedDB for offline reading
      await cacheModule(data.module);
      // Also tell the service worker to cache the API response
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_MODULE',
          url:  `/api/modules/${id}`,
          data: { module: data.module, assessment: data.assessment },
        });
      }
    } catch {
      // Offline fallback — read from IndexedDB
      const cached = await getCachedModule(id);
      if (cached) {
        setModule(cached);
        setIsCached(true);
        toast('📥 Loaded from offline storage.', { duration: 3000 });
      } else {
        toast.error('Module not available offline. Please connect to the internet first.');
        navigate('/dashboard/learner');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-save progress as user scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !module) return;

    const onScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
      if (pct > progress) {
        setProgress(pct);
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => syncProgress(pct, pct >= 95), 2500);
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(syncTimer.current);
    };
  }, [module, progress]);

  const syncProgress = useCallback(async (pct, completed = false) => {
    setSyncing(true);
    try {
      await api.post('/modules/sync', { moduleId: id, progressPct: pct, isCompleted: completed });
      if (completed) toast.success('Module completed! 🎉');
    } catch {
      // Queue for later sync via IndexedDB
      await queueProgress(id, pct, completed);
      if (completed) toast('📴 Completion saved — will sync when online.', { icon: '✓' });
    } finally {
      setSyncing(false);
    }
  }, [id]);

  const markComplete = async () => {
    await syncProgress(100, true);
    setTimeout(() => navigate('/dashboard/learner'), 1400);
  };

  const saveForOffline = async () => {
    if (!module) return;
    try {
      await cacheModule(module);
      setIsCached(true);
      toast.success('✅ Module saved for offline reading!');
    } catch {
      toast.error('Could not save — storage may be full.');
    }
  };

  if (loading) return (
    <div style={loadingPage}>
      <div style={spinnerStyle} />
      <p style={{ color: '#64748b', marginTop: 16 }}>Loading module...</p>
    </div>
  );
  if (!module) return null;

  const lines = (module.content || '').split('\n');

  return (
    <div style={page}>
      {/* ── Top bar ─────────────────────────── */}
      <div style={topBar}>
        <button style={backBtn} onClick={() => navigate('/dashboard/learner')}>← Back</button>
        <div style={topRight}>
          {module.track && <span style={trackChip}>{module.track}</span>}
          {isOffline  && <span style={offlineBadge}>📴 Offline Mode</span>}
          {isCached   && !isOffline && <span style={cachedBadge}>✓ Cached</span>}
          {syncing    && <span style={syncBadge}>⟳ Syncing…</span>}
          {!isCached && (
            <button style={dlBtn} onClick={saveForOffline}>📥 Save Offline</button>
          )}
        </div>
      </div>

      <div style={layout}>
        {/* ── Content ─────────────────────────── */}
        <article style={content} ref={scrollRef}>
          <h1 style={titleStyle}>{module.title}</h1>
          <p  style={desc}>{module.description}</p>

          {(module.duration || module.category) && (
            <div style={metaRow}>
              {module.duration  && <span>⏱ {module.duration} min</span>}
              {module.category  && <span>📂 {module.category}</span>}
              {module.tags && module.tags.split(',').map((t) => (
                <span key={t} style={tagChip}>{t.trim()}</span>
              ))}
            </div>
          )}

          <hr style={divider} />

          {/* Offline notice if showing cached content */}
          {isCached && (
            <div style={offlineNotice}>
              📴 You are reading a cached version of this module. Progress will sync when you reconnect.
            </div>
          )}

          {/* Rendered module content */}
          <div style={body}>
            {module.content ? lines.map((line, i) => {
              if (line.startsWith('# '))   return <h2 key={i} style={h2s}>{line.slice(2)}</h2>;
              if (line.startsWith('## '))  return <h3 key={i} style={h3s}>{line.slice(3)}</h3>;
              if (line.startsWith('### ')) return <h4 key={i} style={h4s}>{line.slice(4)}</h4>;
              if (line.startsWith('- '))   return <li key={i} style={liStyle}>{line.slice(2)}</li>;
              if (line.startsWith('```'))  return null;
              if (line.trim() === '')      return <br key={i} />;
              return <p key={i} style={paraStyle}>{line}</p>;
            }) : <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Content not available offline.</p>}
          </div>

          {/* File download */}
          {module.fileUrl && (
            <a href={module.fileUrl} target="_blank" rel="noreferrer" style={fileLink}>
              📄 Download Module File
            </a>
          )}

          {/* Actions */}
          <div style={actions}>
            {assessment ? (
              <button style={assessBtn} onClick={() => navigate(`/assessment/${assessment.id}`)}>
                Take Assessment →
              </button>
            ) : (
              <button style={completeBtn} onClick={markComplete}>
                ✓ Mark as Complete
              </button>
            )}
          </div>
        </article>

        {/* ── Sidebar ─────────────────────────── */}
        <aside style={sidebar}>
          <div style={sideCard}>
            <h4 style={sideTitle}>Reading Progress</h4>
            <div style={progressBarWrap}>
              <div style={{ ...progressFill, width: `${progress}%` }} />
            </div>
            <p style={progressTxt}>{progress}% read</p>
          </div>

          {assessment && (
            <div style={sideCard}>
              <h4 style={sideTitle}>Assessment</h4>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
                {assessment.title}<br />
                <strong>{assessment.maxScore}</strong> pts · Pass: <strong>{assessment.passMark}</strong>
              </p>
              <button style={assessBtn} onClick={() => navigate(`/assessment/${assessment.id}`)}>
                Start Assessment
              </button>
            </div>
          )}

          <div style={sideCard}>
            <h4 style={sideTitle}>Module Info</h4>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.9 }}>
              Track: <strong>{module.track || '—'}</strong><br />
              Duration: <strong>{module.duration ? `${module.duration} min` : '—'}</strong><br />
              Offline: <strong style={{ color: isCached ? '#065f46' : '#94a3b8' }}>{isCached ? '✓ Saved' : 'Not saved'}</strong>
            </p>
            {!isCached && (
              <button style={{ ...dlBtn, marginTop: 12, width: '100%', textAlign: 'center' }} onClick={saveForOffline}>
                📥 Save for Offline
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────
const page         = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' };
const loadingPage  = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const spinnerStyle = { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' };
const topBar       = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 };
const backBtn      = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 };
const topRight     = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const trackChip    = { background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const offlineBadge = { background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const cachedBadge  = { background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99 };
const syncBadge    = { background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99 };
const dlBtn        = { background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155' };
const layout       = { display: 'flex', gap: 28, padding: '32px 40px', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1 };
const content      = { flex: 1, background: '#fff', borderRadius: 14, padding: 40, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowY: 'auto', maxHeight: 'calc(100vh - 110px)' };
const titleStyle   = { margin: '0 0 12px', fontSize: 28, fontWeight: 800, color: '#1e3a5f', lineHeight: 1.3 };
const desc         = { color: '#64748b', fontSize: 15, margin: '0 0 16px', lineHeight: 1.7 };
const metaRow      = { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#94a3b8', margin: '0 0 8px' };
const tagChip      = { background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontSize: 11 };
const divider      = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' };
const offlineNotice= { background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#92400e', margin: '0 0 20px', lineHeight: 1.6 };
const body         = { lineHeight: 1.8, color: '#334155', fontSize: 15 };
const h2s          = { fontSize: 22, fontWeight: 700, color: '#1e3a5f', margin: '28px 0 12px' };
const h3s          = { fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: '20px 0 8px' };
const h4s          = { fontSize: 15, fontWeight: 700, color: '#334155', margin: '16px 0 6px' };
const paraStyle    = { margin: '0 0 14px' };
const liStyle      = { margin: '4px 0 4px 20px' };
const fileLink     = { display: 'inline-block', margin: '20px 0', padding: '10px 20px', background: '#f1f5f9', borderRadius: 8, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, fontSize: 14 };
const actions      = { marginTop: 40, display: 'flex', gap: 14 };
const assessBtn    = { padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const completeBtn  = { padding: '12px 28px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 };
const sidebar      = { width: 280, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 };
const sideCard     = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const sideTitle    = { margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' };
const progressBarWrap = { height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', margin: '0 0 6px' };
const progressFill = { height: '100%', background: '#1d4ed8', borderRadius: 99, transition: 'width 0.4s ease' };
const progressTxt  = { fontSize: 12, color: '#64748b', margin: 0 };
