import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import UserModals from '../../components/admin/UserModals';
import AdminNavbar from '../../components/layout/AdminNavbar';

const ROLES = ['', 'student', 'tutor', 'admin'];
const STATUSES = ['', 'active', 'inactive', 'pending', 'banned'];

const AdminDashboard = () => {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);

  const [filters, setFilters] = useState({ role: '', status: '', page: 1, limit: 10 });

  // EARS[Event]: WHEN Admin loads dashboard or changes filters, THE system SHALL fetch user list
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page);
      params.set('limit', filters.limit);
      if (filters.role)   params.set('role',   filters.role);
      if (filters.status) params.set('status', filters.status);

      const response = await api.get(`/admin/users?${params.toString()}`);
      const { data, meta: respMeta } = response.data;

      setUsers(data || []);
      setMeta(respMeta || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (error) {
      // EARS[Unwanted]: WHERE Admin lacks permission, THE system SHALL block access
      setErrorMsg(error.response?.data?.error || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getRoleBadgeClass = (role) => {
    const map = { admin: 'danger', tutor: 'warning', student: 'primary', user: 'secondary' };
    return `badge bg-${map[role] || 'secondary'} text-capitalize`;
  };

  const getStatusBadgeClass = (status) => {
    const map = { active: 'success', inactive: 'secondary', pending: 'warning', banned: 'danger' };
    return `badge bg-${map[status] || 'secondary'} text-capitalize`;
  };

  return (
    <>
      <AdminNavbar />
      <div className="container-fluid py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="fw-bold mb-0">Quản lý Người dùng</h2>
        <span className="text-secondary">
          Tổng: <strong data-testid="total-count">{meta.total}</strong> người dùng
        </span>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-semibold text-secondary">Vai trò</label>
            <select
              className="form-select"
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              data-testid="role-filter"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Tất cả'}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold text-secondary">Trạng thái</label>
            <select
              className="form-select"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              data-testid="status-filter"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tất cả'}</option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => setFilters({ role: '', status: '', page: 1, limit: 10 })}
              data-testid="reset-filter-btn"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="alert alert-danger" role="alert" data-testid="error-alert">{errorMsg}</div>
      )}

      {/* Table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" data-testid="users-table">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-secondary" data-testid="loading-state">
                    Đang tải...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-secondary" data-testid="empty-state">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((u, index) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="text-secondary">{(filters.page - 1) * filters.limit + index + 1}</td>
                    <td className="fw-semibold">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className={getRoleBadgeClass(u.role)}>{u.role}</span></td>
                    <td><span className={getStatusBadgeClass(u.status)}>{u.status}</span></td>
                    <td className="text-secondary">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="text-center">
                      {/* EARS[State-driven]: WHILE admin row matches currentAdmin, hide action buttons */}
                      {currentAdmin && currentAdmin.id === u.id ? (
                        <span className="text-secondary fst-italic">Bạn</span>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          data-testid={`action-btn-${u.id}`}
                          onClick={() => setSelectedUser(u)}
                        >
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

        {/* Pagination */}
        {!loading && meta.totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top">
            <span className="text-secondary">
              Trang <strong>{meta.page}</strong> / {meta.totalPages}
            </span>
            <nav aria-label="User list pagination">
              <ul className="pagination mb-0">
                <li className={`page-item ${meta.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(meta.page - 1)}
                    data-testid="prev-page-btn"
                  >
                    &laquo;
                  </button>
                </li>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === meta.page ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(p)}
                      data-testid={`page-btn-${p}`}
                    >
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${meta.page >= meta.totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(meta.page + 1)}
                    data-testid="next-page-btn"
                  >
                    &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
      
      {/* T050: Admin Action Modals */}
      <UserModals 
        selectedUser={selectedUser} 
        onClose={() => setSelectedUser(null)} 
        onSuccess={() => fetchUsers()} 
      />
    </div>
    </>
  );
};

export default AdminDashboard;
