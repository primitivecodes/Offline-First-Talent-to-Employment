import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const PaymentHistory = () => {
  const navigate  = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/payments/my-payments')
      .then(({ data }) => setPayments(data.payments))
      .catch(() => toast.error('Could not load payment history.'))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s) => ({
    successful: { bg: '#d1fae5', color: '#065f46' },
    pending:    { bg: '#fef3c7', color: '#92400e' },
    failed:     { bg: '#fee2e2', color: '#dc2626' },
    cancelled:  { bg: '#f1f5f9', color: '#64748b' },
  }[s] || { bg: '#f1f5f9', color: '#64748b' });

  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={title}>Payment History</h2>
      </div>

      <div style={body}>
        {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}

        {!loading && payments.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 48 }}>💳</div>
            <h3 style={{ color: '#1e3a5f', margin: '16px 0 8px' }}>No payments yet</h3>
            <p style={{ color: '#64748b' }}>Your payment history will appear here.</p>
          </div>
        )}

        {payments.length > 0 && (
          <table style={table}>
            <thead>
              <tr>
                {['Date', 'Type', 'Amount', 'Phone', 'Status', 'Reference'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const sc = statusColor(p.status);
                return (
                  <tr key={p.id} style={tr}>
                    <td style={td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={td}>{p.type === 'learner_access' ? 'Course Access' : 'Employer Subscription'}</td>
                    <td style={{ ...td, fontWeight: 700 }}>${p.amountUSD} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({p.amount?.toLocaleString()} RWF)</span></td>
                    <td style={td}>{p.phone}</td>
                    <td style={td}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{p.id.slice(0, 8).toUpperCase()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const page   = { minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' };
const header = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20 };
const backBtn = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: 0 };
const title  = { margin: 0, color: '#1e3a5f', fontSize: 20, fontWeight: 700 };
const body   = { padding: '36px 40px', maxWidth: 1100, margin: '0 auto' };
const table  = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const th     = { padding: '14px 18px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
const tr     = { borderBottom: '1px solid #f1f5f9' };
const td     = { padding: '14px 18px', fontSize: 14, color: '#334155' };
