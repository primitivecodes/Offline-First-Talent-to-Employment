import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const MomoPaymentModal = ({ type, onSuccess, onClose }) => {
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState('idle'); // idle | pending | polling | done

  const isDemo     = phone.replace(/\s/g, '') === '1111111111';
  const fee        = type === 'learner' ? '$10 one-time' : '$20/month';
  const endpoint   = type === 'learner'
    ? '/payments/learner/initiate'
    : '/payments/employer/initiate';

  const pay = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number.'); return; }
    setLoading(true);
    setStatus('pending');
    try {
      const { data } = await api.post(endpoint, { phone });

      // Demo mode — instant success
      if (data.demo || data.status === 'successful') {
        setStatus('done');
        toast.success(data.message || 'Access granted!');
        setTimeout(() => onSuccess(data), 800);
        return;
      }

      // Real MTN — poll for status
      setStatus('polling');
      toast('MTN MoMo prompt sent to your phone. Please approve it.', { icon: '📱' });
      pollStatus(data.paymentId);
    } catch (err) {
      setStatus('idle');
      toast.error(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = (paymentId, attempts = 0) => {
    if (attempts > 36) {
      setStatus('idle');
      toast.error('Payment timed out. Please try again.');
      return;
    }
    setTimeout(async () => {
      try {
        const { data } = await api.get(`/payments/verify/${paymentId}`);
        if (data.status === 'successful') {
          setStatus('done');
          toast.success('Payment confirmed!');
          setTimeout(() => onSuccess(data), 800);
        } else if (data.status === 'failed') {
          setStatus('idle');
          toast.error(data.reason || 'Payment failed. Please try again.');
        } else {
          pollStatus(paymentId, attempts + 1);
        }
      } catch {
        pollStatus(paymentId, attempts + 1);
      }
    }, 5000);
  };

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Header */}
        <div style={modalHeader}>
          <h3 style={modalTitle}>
            {type === 'learner' ? '🎓 Unlock All Courses' : '💼 Employer Subscription'}
          </h3>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        {status === 'done' ? (
          <div style={successBox}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: '#065f46', fontWeight: 600, fontSize: 16, margin: 0 }}>
              Access granted!
            </p>
          </div>
        ) : status === 'polling' ? (
          <div style={pendingBox}>
            <div style={spinner} />
            <p style={{ color: '#1d4ed8', fontWeight: 600, marginTop: 16 }}>
              Waiting for MTN MoMo confirmation...
            </p>
            <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>
              Please approve the prompt on your phone.
            </p>
          </div>
        ) : (
          <>
            <div style={feeBox}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{fee}</span>
              <span style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {type === 'learner'
                  ? 'One-time payment for lifetime course access'
                  : 'Monthly subscription — cancel anytime'}
              </span>
            </div>

            {/* Demo hint */}
            <div style={demoHint}>
              💡 <strong>Demo mode:</strong> Enter <code style={code}>1111111111</code> for instant access without MTN payment.
            </div>

            <div style={inputGroup}>
              <label style={inputLabel}>Phone number</label>
              <input
                style={inputStyle}
                type="tel"
                placeholder="e.g. 1111111111 for demo"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pay()}
              />
              {isDemo && (
                <p style={{ fontSize: 12, color: '#065f46', marginTop: 6, fontWeight: 600 }}>
                  ✓ Demo mode — instant access will be granted
                </p>
              )}
            </div>

            <button style={payBtn} onClick={pay} disabled={loading}>
              {loading
                ? 'Processing...'
                : isDemo
                  ? '🚀 Grant Demo Access'
                  : `Pay ${fee} via MTN MoMo`
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const overlay     = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
const modal       = { background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 };
const modalTitle  = { margin: 0, color: '#1e3a5f', fontSize: 18, fontWeight: 700 };
const closeBtn    = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', padding: 0 };
const feeBox      = { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', borderRadius: 12, padding: '20px 16px', marginBottom: 20 };
const demoHint    = { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 20, lineHeight: 1.6 };
const code        = { background: '#dcfce7', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 };
const inputGroup  = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 };
const inputLabel  = { fontSize: 13, fontWeight: 600, color: '#374151' };
const inputStyle  = { padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none' };
const payBtn      = { width: '100%', padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' };
const successBox  = { textAlign: 'center', padding: '32px 0' };
const pendingBox  = { textAlign: 'center', padding: '32px 0' };
const spinner     = { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' };