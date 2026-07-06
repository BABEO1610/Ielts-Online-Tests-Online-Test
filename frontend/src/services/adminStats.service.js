import api from './api';

const ok = (data) => ({ data, isSample: false });

export async function fetchOverview() {
  const res = await api.get('/admin/overview');
  return ok(res.data.data);
}

export async function fetchActivityLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const suffix = qs ? `?${qs}` : '';
  const res = await api.get(`/admin/audit-logs${suffix}`);
  return ok({
    rows: res.data.data ?? [],
    total: res.data.meta?.total ?? (res.data.data ?? []).length,
  });
}

export async function fetchAiUsage(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const suffix = qs ? `?${qs}` : '';
  const res = await api.get(`/admin/ai-usage${suffix}`);
  return ok(res.data.data);
}
