import { useCallback, useEffect, useRef, useState } from 'react';
import gradingService from '../services/grading.service';

const TERMINAL = new Set(['completed', 'needs_review', 'failed']);

class SpeakingPollingSession {
  constructor(options) {
    Object.assign(this, options);
    this.controller = new AbortController();
    this.active = true;
  }

  schedule(delay) {
    this.timerRef.current = window.setTimeout(() => this.poll(), delay);
  }

  async poll() {
    try {
      const next = await this.refresh(this.controller.signal);
      if (!this.active || TERMINAL.has(next?.status)) {
        if (this.active) this.finish();
        return;
      }
      this.attemptRef.current += 1;
      this.schedule(Math.min(10000, 1500 * (2 ** Math.min(this.attemptRef.current, 3))));
    } catch (requestError) {
      if (!this.active || ['CanceledError', 'AbortError'].includes(requestError.name)) return;
      this.setError(requestError.response?.data?.error?.message || requestError.message);
      this.attemptRef.current += 1;
      this.schedule(Math.min(10000, 2000 * this.attemptRef.current));
    }
  }

  finish() {
    this.setIsPolling(false);
    try {
      if (window.sessionStorage.getItem('speaking:pending-group') === this.groupId) {
        window.sessionStorage.removeItem('speaking:pending-group');
      }
    } catch {
      // Polling vẫn kết thúc bình thường khi trình duyệt chặn sessionStorage.
    }
  }

  async start() {
    await Promise.resolve();
    if (!this.active) return;
    this.attemptRef.current = 0;
    this.setIsPolling(true);
    await this.poll();
  }

  stop() {
    this.active = false;
    this.controller.abort();
    if (this.timerRef.current) window.clearTimeout(this.timerRef.current);
  }
}

const useSpeakingGrading = (groupId, { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingGeneration, setPollingGeneration] = useState(0);
  const timerRef = useRef(null);
  const attemptRef = useRef(0);

  const refresh = useCallback(async (signal) => {
    if (!groupId) return null;
    const response = await gradingService.getSpeakingGradingStatus(groupId, { signal });
    const next = response.data;
    setData(next);
    setError(null);
    return next;
  }, [groupId]);

  useEffect(() => {
    if (!enabled || !groupId) return undefined;
    const session = new SpeakingPollingSession({
      groupId, refresh, setError, setIsPolling, timerRef, attemptRef,
    });
    void session.start();
    return () => session.stop();
  }, [enabled, groupId, refresh, pollingGeneration]);

  const restartPolling = useCallback(() => {
    setError(null);
    setPollingGeneration((current) => current + 1);
  }, []);

  return { data, error, isPolling, refresh, restartPolling };
};

export default useSpeakingGrading;
