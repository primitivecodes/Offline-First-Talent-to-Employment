import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const AdminSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [mentors,     setMentors]     = useState([]);
  const [filter,      setFilter]      = useState('submitted');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    loadSubmissions();
    api.get('/users?role=mentor').then(({ data }) => setMentors(data.users)).catch(() => {});
  }, [filter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/submissions?status=${filter}`);
      setSubmissions(data.submissions);
    } catch { toast.error('Could not load submissions.'); }
    finally { setLoading(false); }
  };

  const assign = async (subId, mentorId) => {
    try {
      await api.patch(`/submissions/${subId}/assign`, { mentorId });
      toast.success('Assigned to mentor.');
      loadSubmissions();
    } catch { toast.error('Could not assign.'); }
  };

  const setStatus = async (subId, status) => {
    try {
      await api.patch(`/submissions/${subId}/status`, { status });
      toast.success(`Marked as ${status}.`);
      loadSubmissions();
    } catch { toast.error('Could not update.'); }
  };

  const issueCert = async (sub) => {
    try {
      await api.post('/admin/certificates', { learnerId: sub.learnerId, moduleId: sub.moduleId, skillArea: `Module Completion` });
      toast.success('Certificate issued.');
    } catch { toast.error('Could not issue certificate.'); }
  };

  const statusColor = (s) => ({ submitted: '#fef3c7', under_review: '#dbeafe', reviewed: '#ede9fe', approved: '#d1fae5', rejected: '#fee2e2' }[s] || '#f1f5f9');
  const statusText  = (s) => ({ submitted: '#92400e', under_review: '#1e40af', reviewed: '#5b21b6', approved: '#065f46', rejected: '#dc2626' }[s] || '#334155');

  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={() => navigate('/dashboard/admin')}>← Admin</button>
        <h2 style={title}>Submissions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['submitted', 'under_review', 'reviewed', 'approved', 'rejected'].map(s => (
            <button key={s} style={{ ...filterBtn, ...(filter === s ? filterActive : {}) }} onClick={() => setFilter(s)}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div style={body}>
        {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}
        {!loading && submissions.length === 0 && <p style={{ color: '#94a3b8' }}>No submissions with status: {filter}.</p>}

        {submissions.map(sub => (
          <div key={sub.id} style={card}>
            <div style={cardTop}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', color: '#1e3a5f', fontSize: 15 }}>{sub.projectTitle}</h3>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Learner: {sub.learnerId?.slice(0, 8)} · Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                </p>
                {sub.description && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>{sub.description}</p>}
              </div>
              <span style={{ background: statusColor(sub.status), color: statusText(sub.status), padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {sub.status.replace('_', ' ')}
              </span>
            </div>

            <div style={cardActions}>
              {/* Assign mentor */}
              {(sub.status === 'submitted' || sub.status === 'under_review') && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    style={select}
                    defaultValue={sub.assignedMentorId || ''}
                    onChange={(e) => e.target.value && assign(sub.id, e.target.value)}
                  >
                    <option value="">Assign to mentor...</option>
                    {mentors.map(m => <option key={m.id} value={m.id}>{m.name} ({m.expertise || 'General'})</option>)}
                  </select>
                </div>
              )}

              {/* Status actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {sub.status !== 'approved' && (
                  <button style={approveBtn} onClick={() => setStatus(sub.id, 'approved')}>✓ Approve</button>
                )}
                {sub.status !== 'rejected' && (
                  <button style={rejectBtn} onClick={() => setStatus(sub.id, 'rejected')}>✕ Reject</button>
                )}
                {sub.status === 'approved' && (
                  <button style={certBtn} onClick={() => issueCert(sub)}>🎓 Issue Certificate</button>
                )}
                {sub.fileUrl && (
                  <a href={sub.fileUrl} target="_blank" rel="noreferrer" style={downloadBtn}>📄 Download</a>
                )}
                {sub.repoUrl && (
                  <a href={sub.repoUrl} target="_blank" rel="noreferrer" style={downloadBtn}>🔗 Repo</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const page       = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const header     = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' };
const backBtn    = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0, flexShrink: 0 };
const title      = { margin: 0, color: '#1e3a5f', fontSize: 18, fontWeight: 700, flexShrink: 0 };
const filterBtn  = { padding: '6px 12px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'capitalize' };
const filterActive = { background: '#1d4ed8', color: '#fff', borderColor: '#1d4ed8' };
const body       = { padding: '28px 40px', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 };
const card       = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const cardTop    = { display: 'flex', gap: 14, marginBottom: 14 };
const cardActions = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' };
const select     = { padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', minWidth: 200 };
const approveBtn = { padding: '7px 16px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const rejectBtn  = { padding: '7px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const certBtn    = { padding: '7px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 };
const downloadBtn = { padding: '7px 16px', background: '#f1f5f9', color: '#334155', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' };
