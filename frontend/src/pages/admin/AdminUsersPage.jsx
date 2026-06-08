import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import UserModals from '../../components/admin/UserModals';
import { formatDate, rolePill, statusPill } from '../../utils/adminFormat';

const ROLES = ['', 'student', 'tutor', 'admin'];
const STATUSES = ['', 'active', 'inactive', 'pending', 'banned'];

const AdminUsersPage = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({ role: '', status: '', page: 1, limit: 10 });

  // EARS[Event]: WHEN Admin loads page or changes filters, THE system SHALL fetch the user list
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page);
      params.set('limit', filters.limit);
      if (filters.role) params.set('role', filters.role);
      if (filters.status) params.set('status', filters.status);

      const response = await api.get(`/admin/users?${params.toString()}`);
      const { data, meta: respMeta } = response.data;
      setUsers(data || []);
      const total = respMeta?.total ?? 0;
      const limit = respMeta?.limit ?? filters.limit;
      setMeta({ page: respMeta?.page ?? 1, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
      setErrorMsg(error.response?.data?.error?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const countBy = (key, val) => users.filter((u) => u[key] === val).length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Quản lý người dùng</h1>
          <p className="body-sm text-secondary m-0">Tổng <strong data-testid="total-count">{meta.total}</strong> người dùng trong hệ thống.</p>
        </div>
      </div>

      {/* Analytics summary for the current page */}
      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Active (trang này)</span><span className="stat-card__value">{countBy('status', 'active')}</span></div>
        <div className="stat-card"><span className="stat-card__label">Chờ duyệt</span><span className="stat-card__value">{countBy('status', 'pending')}</span></div>
        <div className="stat-card"><span className="stat-card__label">Giảng viên</span><span className="stat-card__value">{countBy('role', 'tutor')}</span></div>
        <div className="stat-card"><span className="stat-card__label">Bị khoá</span><span className="stat-card__value">{countBy('status', 'banned')}</span></div>
      </div>

      {/* Filter bar */}
      <div className="admin-card mb-4">
        <div className="admin-card__body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-semibold text-secondary">Vai trò</label>
              <select className="form-select" name="role" value={filters.role} onChange={handleFilterChange} data-testid="role-filter">
                {ROLES.map((r) => <option key={r} value={r}>{r ? r[0].toUpperCase() + r.slice(1) : 'Tất cả'}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold text-secondary">Trạng thái</label>
              <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange} data-testid="status-filter">
                {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'Tất cả'}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <button className="btn-pill btn-pill--ghost w-100" onClick={() => setFilters({ role: '', status: '', page: 1, limit: 10 })} data-testid="reset-filter-btn">
                Đặt lại bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && <div className="alert alert-danger rounded-4" role="alert" data-testid="error-alert">{errorMsg}</div>}

      {/* Table */}
      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table" data-testid="users-table">
            <thead>
              <tr><th>#</th><th>Họ và tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th className="text-end">Hành động</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary" data-testid="loading-state">Đang tải…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-4 text-secondary" data-testid="empty-state">Không tìm thấy người dùng nào.</td></tr>
              ) : (
                users.map((u, index) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="text-secondary">{(filters.page - 1) * filters.limit + index + 1}</td>
                    <td className="fw-semibold">{u.full_name || '—'}</td>
                    <td className="text-secondary">{u.email}</td>
                    <td><span className={`pill ${rolePill(u.role)}`}>{u.role}</span></td>
                    <td><span className={`pill ${statusPill(u.status)}`}>{u.status}</span></td>
                    <td className="text-secondary">{formatDate(u.created_at)}</td>
                    <td className="text-end">
                      {currentAdmin && currentAdmin.id === u.id ? (
                        <span className="text-secondary fst-italic">Bạn</span>
                      ) : (
                        <button className="btn-pill btn-pill--ghost" data-testid={`action-btn-${u.id}`} onClick={() => setSelectedUser(u)}>
                          Quản lý
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && meta.totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top">
            <span className="text-secondary">Trang <strong>{meta.page}</strong> / {meta.totalPages}</span>
            <nav aria-label="Phân trang người dùng">
              <ul className="pagination mb-0">
                <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(meta.page - 1)} data-testid="prev-page-btn">&laquo;</button>
                </li>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === meta.page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(p)} data-testid={`page-btn-${p}`}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(meta.page + 1)} data-testid="next-page-btn">&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      <UserModals selectedUser={selectedUser} onClose={() => setSelectedUser(null)} onSuccess={() => fetchUsers()} />
    </div>
  );
};

export default AdminUsersPage;
