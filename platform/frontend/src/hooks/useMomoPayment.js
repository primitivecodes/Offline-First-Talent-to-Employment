import { useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/**
 * useMomoPayment
 * Handles initiating and polling an MTN MoMo payment.
 *
 * Usage:
 *   const { initiate, status, loading } = useMomoPayment();
 *   await initiate('learner');  // or 'employer'
 */
export const useMomoPayment = (onSuccess) => {
  const [status, setStatus]   = useState('idle'); // idle | pending | successful | failed
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  const poll = useCallback(async (id, attempts = 0) => {
    if (attempts > 36) { // ~3 minutes of polling
      setStatus('failed');
      toast.error('Payment timed out. Please try again.');
      return;
    }
    try {
      const { data } = await api.get(`/payments/verify/${id}`);
      if (data.status === 'successful') {
        setStatus('successful');
        toast.success(data.message || 'Payment confirmed!');
        if (onSuccess) onSuccess(data);
      } else if (data.status === 'failed') {
        setStatus('failed');
        toast.error(data.reason || 'Payment failed. Please try again.');
      } else {
        // Still pending — poll again in 5 seconds
        setTimeout(() => poll(id, attempts + 1), 5000);
      }
    } catch (err) {
      setTimeout(() => poll(id, attempts + 1), 5000);
    }
  }, [onSuccess]);

  const initiate = useCallback(async (type, phone) => {
    setLoading(true);
    setStatus('pending');
    try {
      const endpoint = type === 'learner'
        ? '/payments/learner/initiate'
        : '/payments/employer/initiate';

      const { data } = await api.post(endpoint, { phone });
      setPaymentId(data.paymentId);
      toast('MTN MoMo prompt sent to your phone. Please approve it.', { icon: '📱' });

      // Start polling after the suggested delay
      setTimeout(() => poll(data.paymentId), (data.checkStatusIn || 10) * 1000);
    } catch (err) {
      setStatus('failed');
      const msg = err.response?.data?.message || 'Could not initiate payment.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [poll]);

  return { initiate, status, loading, paymentId };
};
