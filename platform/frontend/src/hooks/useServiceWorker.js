import { useEffect } from 'react';
import api from '../utils/api';
import {
  getProgressQueue,
  removeFromProgressQueue,
  getAssessmentQueue,
  removeFromAssessmentQueue,
} from '../utils/offlineDB';

export const useServiceWorker = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Registered. Scope:', reg.scope);
          setInterval(() => reg.update(), 60 * 60 * 1000);
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'FLUSH_PROGRESS')    flushProgressQueue();
        if (event.data?.type === 'FLUSH_ASSESSMENTS') flushAssessmentQueue();
      });
    }

    const handleOnline = () => {
      flushProgressQueue();
      flushAssessmentQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
};

export const flushProgressQueue = async () => {
  let queue;
  try { queue = await getProgressQueue(); } catch { return; }
  if (!queue?.length) return;
  for (const item of queue) {
    try {
      await api.post('/modules/sync', {
        moduleId:    item.moduleId,
        progressPct: item.progressPct,
        isCompleted: item.isCompleted,
      });
      await removeFromProgressQueue(item.moduleId);
    } catch {}
  }
};

export const flushAssessmentQueue = async () => {
  let queue;
  try { queue = await getAssessmentQueue(); } catch { return; }
  if (!queue?.length) return;
  for (const item of queue) {
    try {
      await api.post(`/assessments/${item.assessmentId}/submit`, {
        answers:          item.answers,
        timeTakenMinutes: item.timeTakenMinutes,
        submittedOffline: true,
      });
      await removeFromAssessmentQueue(item.assessmentId);
    } catch {}
  }
}; 