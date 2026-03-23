import { useState } from 'react';
import { useMomoPayment } from '../hooks/useMomoPayment';
import { useAuth } from '../context/AuthContext';

/**
 * MomoPaymentModal
 * Shown when a learner tries to open a course without paying,
 * or when an employer needs to subscribe.
 *
 * Props:
 *   type       - 'learner' | 'employer'
 *   onSuccess  - callback after confirmed payment
 *   onClose    - callback to close modal
 */
export const MomoPaymentModal = ({ type, onSuccess, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [phone, setPhone]     = useState(user?.phone || '');

  const handleSuccess = async (data) => {
    await refreshUser(); // update hasPaidAccess / subscriptionStatus in context
    if (onSuccess) onSuccess(data);
  };

  const { initiate, status, loading } = useMomoPayment(handleSuccess);

  const isLearner  = type === 'learner';
  const amount     = isLearner ? '$10 (one-time)' : '$20/month';
  const purpose    = isLearner ? 'unlock all courses' : 'access graduate talent profiles';

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <span style={{ fontSize: 28 }}>📱</span>
          <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: 20 }}>MTN Mobile Money Payment</h2>
        </div>

        {status === 'idle' || status === 'failed' ? (
          <>
            <p style={desc}>
              To <strong>{purpose}</strong>, a payment of <strong>{amount}</strong> is required via MTN Mobile Money.
            </p>

            <div style={field}>
              <label style={label}>MTN MoMo Phone Number</label>
              <input
                style={input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 250781234567"
                type="tel"
              />
              <small style={{ color: '#64748b' }}>Include country code. No + symbol needed.</small>
            </div>

            {status === 'failed' && (
              <div style={errorBox}>Payment failed or was declined. Please check your balance and try again.</div>
            )}

            <div style={btnRow}>
              <button style={cancelBtn} onClick={onClose}>Cancel</button>
              <button
                style={payBtn}
                onClick={() => initiate(type, phone)}
                disabled={loading || !phone}
              >
                {loading ? 'Sending prompt...' : `Pay ${amount}`}
              </button>
            </div>
          </>
        ) : status === 'pending' ? (
          <div style={pendingBox}>
            <div style={spinner} />
            <p style={{ fontWeight: 600, color: '#1e3a5f' }}>Waiting for your approval</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Check your phone for an MTN MoMo prompt and enter your PIN to confirm the payment.
            </p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>This page will update automatically.</p>
          </div>
        ) : status === 'successful' ? (
          <div style={successBox}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p style={{ fontWeight: 700, color: '#065f46', fontSize: 16 }}>Payment confirmed!</p>
            <p style={{ color: '#047857', fontSize: 14 }}>
              {isLearner ? 'You now have full access to all courses.' : 'Your subscription is active for 30 days.'}
            </p>
            <button style={payBtn} onClick={onClose}>Continue</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
const modal     = { background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.16)' };
const header    = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 };
const desc      = { color: '#475569', lineHeight: 1.6, marginBottom: 20 };
const field     = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 };
const label     = { fontWeight: 600, fontSize: 13, color: '#334155' };
const input     = { padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' };
const btnRow    = { display: 'flex', gap: 12, marginTop: 8 };
const cancelBtn = { flex: 1, padding: 12, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#334155' };
const payBtn    = { flex: 2, padding: 12, background: '#ffd100', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, color: '#1a1a1a', fontSize: 14 };
const errorBox  = { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, color: '#991b1b', fontSize: 13, marginBottom: 16 };
const pendingBox= { textAlign: 'center', padding: '20px 0' };
const successBox= { textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 };
const spinner   = {
  width: 48, height: 48, border: '5px solid #e2e8f0',
  borderTop: '5px solid #ffd100', borderRadius: '50%',
  animation: 'spin 1s linear infinite', margin: '0 auto 16px',
};
