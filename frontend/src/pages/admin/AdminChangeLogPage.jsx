import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchChangeLog, fetchChangeLogDetail, revertChange } from '../../services/adminOps.service';
import { actionLabel, diffValues, displayValue, formatDateTime } from '../../utils/adminFormat';

const ACTION_SEARCH_MAP = [
  ['đổi vai trò', 'role_changed'],
  ['doi vai tro', 'role_changed'],
  ['role', 'role_changed'],
  ['vô hiệu hoá', 'user_deactivated'],
  ['vô hiệu hóa', 'user_deactivated'],
  ['vo hieu hoa', 'user_deactivated'],
  ['trạng thái', 'user_deactivated'],
  ['trang thai', 'user_deactivated'],
  ['hoàn tác', 'change_reverted'],
  ['hoan tac', 'change_reverted'],
  ['đăng nhập', 'login'],
  ['dang nhap', 'login'],
  ['đăng xuất', 'logout'],
  ['dang xuat', 'logout'],
  ['đổi mật khẩu', 'password_changed'],
  ['doi mat khau', 'password_changed'],
  ['xoá người dùng', 'user_deleted'],
  ['xóa người dùng', 'user_deleted'],
  ['xoa nguoi dung', 'user_deleted'],
  ['sửa đề thi', 'test_updated'],
  ['sua de thi', 'test_updated'],
  ['xoá tài liệu', 'resource_deleted'],
  ['xóa tài liệu', 'resource_deleted'],
  ['xoa tai lieu', 'resource_deleted'],
];

const resolveActionFilter = (value) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  const match = ACTION_SEARCH_MAP.find(([label]) => label.includes(normalized) || normalized.includes(label));
  return match?.[1] || normalized;
};

const AdminChangeLogPage = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [actionQuery, setActionQuery] = useState('');
  const [appliedActionQuery, setAppliedActionQuery] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const load = useCallback(async ({ page = meta.page, limit = meta.limit, query = appliedActionQuery } = {}) => {
    setLoading(true);
    const action = resolveActionFilter(query);
    const res = await fetchChangeLog({ page, limit, action });
    setRows(res.data);
    setSummary(res.meta?.summary ?? null);
    setMeta({
      page: res.meta?.page ?? page,
      limit: res.meta?.limit ?? limit,
      total: res.meta?.total ?? res.data.length,
    });
    setIsSample(res.isSample);
    setLoading(false);
  }, [appliedActionQuery, meta.limit, meta.page]);

  useEffect(() => { load({ page: 1 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (event) => {
    event.preventDefault();
    setAppliedActionQuery(actionQuery);
    load({ page: 1, query: actionQuery });
  };

  const clearSearch = () => {
    setActionQuery('');
    setAppliedActionQuery('');
    load({ page: 1, query: '' });
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || loading) return;
    load({ page: nextPage });
  };

  const changeLimit = (event) => {
    const nextLimit = Number(event.target.value);
    load({ page: 1, limit: nextLimit });
  };

  const onRevert = async (row) => {
    setBusy(true);
    await revertChange(row.id);
    setRows((prev) => prev.map((item) => (
      item.id === row.id ? { ...item, reverted: true, revertable: false } : item
    )));
    setSummary((prev) => prev ? {
      ...prev,
      undoable: Math.max(0, Number(prev.undoable || 0) - 1),
      undone: Number(prev.undone || 0) + 1,
    } : prev);
    setBusy(false);
    setSelected(null);
  };

  const openDetail = async (row) => {
    setDetailLoadingId(row.id);
    const res = await fetchChangeLogDetail(row.id);
    setSelected(res.data ? { ...row, ...res.data } : row);
    setDetailLoadingId(null);
  };

  const totalChanges = summary?.total ?? meta.total;
  const undoableChanges = summary?.undoable ?? rows.filter((row) => row.revertable).length;
  const undoneChanges = summary?.undone ?? rows.filter((row) => row.reverted).length;
  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / meta.limit));

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, meta.page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [meta.page, totalPages]);

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="display-md mb-1">Nhật ký duyệt &amp; thay đổi</h1>
          <p className="body-sm text-secondary m-0">Xem chi tiết mọi thay đổi do admin thực hiện và hoàn tác khi cần.</p>
        </div>
        {isSample && <span className="admin-data-note">Dữ liệu mẫu: API change-logs chưa phản hồi</span>}
      </div>

      <div className="stat-grid mb-4">
        <div className="stat-card"><span className="stat-card__label">Tổng thay đổi</span><span className="stat-card__value">{totalChanges}</span></div>
        <div className="stat-card"><span className="stat-card__label">Có thể hoàn tác</span><span className="stat-card__value">{undoableChanges}</span></div>
        <div className="stat-card"><span className="stat-card__label">Đã hoàn tác</span><span className="stat-card__value">{undoneChanges}</span></div>
      </div>

      <form className="admin-card__header mb-3" onSubmit={onSearch}>
        <div className="d-flex flex-wrap align-items-center gap-2 w-100">
          <input
            className="form-control"
            style={{ maxWidth: 360 }}
            value={actionQuery}
            onChange={(event) => setActionQuery(event.target.value)}
            placeholder="Tìm theo hành động: đổi vai trò, hoàn tác, đăng xuất..."
          />
          {/* 📌 [SWIMLANE L3-B2 | STT 1] Button: Tìm kiếm
               Loại: <button type="submit"> | Dòng gốc: L148
               Action: submit form → onSearch() → setAppliedActionQuery → load({ page:1, query })
               Ghi chú: query được xử lý qua resolveActionFilter() — fuzzy match tiếng Việt */}
          <button type="submit" className="btn-pill btn-pill--dark" disabled={loading}>Tìm kiếm</button>
          {/* 📌 [SWIMLANE L3-B2 | STT 2] Button: Xóa lọc
               Loại: <button type="button"> | Dòng gốc: L149–L151
               Action: onClick → clearSearch() → reset cả actionQuery + appliedActionQuery → load lại
               State: disabled khi loading || (actionQuery && appliedActionQuery đều rỗng) */}
          <button type="button" className="btn-pill btn-pill--ghost" onClick={clearSearch} disabled={loading || (!actionQuery && !appliedActionQuery)}>
            Xóa lọc
          </button>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="caption text-secondary">Mỗi trang</span>
            {/* 📌 [SWIMLANE L3-B2 | STT 3] Dropdown: Mỗi trang (phân trang)
                 Loại: <select> | Dòng gốc: L154–L158
                 Options: 10, 20, 50 bản ghi/trang
                 Action: onChange → changeLimit → load({ page:1, limit: nextLimit }) */}
            <select className="form-select" style={{ width: 92 }} value={meta.limit} onChange={changeLimit} disabled={loading}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </form>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Admin</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Trạng thái</th>
                <th className="text-end">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-secondary">Không tìm thấy log phù hợp.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="text-secondary">{formatDateTime(row.created_at)}</td>
                    <td className="fw-semibold">{row.actor}</td>
                    <td>{row.action_label || actionLabel(row.action)}</td>
                    <td className="text-secondary">{row.target_label}</td>
                    <td>
                      {row.reverted
                        ? <span className="pill pill--neutral">Đã hoàn tác</span>
                        : <span className="pill pill--info">Đang áp dụng</span>}
                    </td>
                    <td className="text-end">
                      {/* 📌 [SWIMLANE L3-B2 | STT 4] Button: Xem thay đổi
                           Loại: <button class="btn-pill--ghost"> | Dòng gốc: L194–L196
                           Action: onClick → openDetail(row) → fetchChangeLogDetail(row.id)
                                   → setSelected(row+detail) → mở ChangeDetailModal
                           State: disabled khi detailLoadingId === row.id (hiện 'Đang tải...') */}
                      <button className="btn-pill btn-pill--ghost" onClick={() => openDetail(row)} disabled={detailLoadingId === row.id}>
                        {detailLoadingId === row.id ? 'Đang tải...' : 'Xem thay đổi'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-card__header border-top d-flex flex-wrap align-items-center gap-2">
          <span className="caption text-secondary me-auto">
            Trang {meta.page}/{totalPages} - {meta.total} log
          </span>
          {/* 📌 [SWIMLANE L3-B2 | STT 5] Button: Trước (phân trang)
               Loại: <button class="btn-pill--ghost"> | Dòng gốc: L209–L211
               Action: onClick → changePage(page - 1) → load({ page: nextPage })
               State: disabled khi loading || page <= 1 */}
          <button className="btn-pill btn-pill--ghost" type="button" onClick={() => changePage(meta.page - 1)} disabled={loading || meta.page <= 1}>
            Trước
          </button>
          {/* 📌 [SWIMLANE L3-B2 | STT 6] Button: Số trang (phân trang)
               Loại: <button class="btn-pill"> | Dòng gốc: L212–L222
               Active page → 'btn-pill--dark' (tô đen) | Trang khác → 'btn-pill--ghost'
               Action: onClick → changePage(page) → load({ page })
               State: disabled khi loading || page === meta.page (trang hiện tại) */}
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`btn-pill ${page === meta.page ? 'btn-pill--dark' : 'btn-pill--ghost'}`}
              type="button"
              onClick={() => changePage(page)}
              disabled={loading || page === meta.page}
            >
              {page}
            </button>
          ))}
          {/* 📌 [SWIMLANE L3-B2 | STT 7] Button: Sau (phân trang)
               Loại: <button class="btn-pill--ghost"> | Dòng gốc: L223–L225
               Action: onClick → changePage(page + 1) → load({ page: nextPage })
               State: disabled khi loading || page >= totalPages */}
          <button className="btn-pill btn-pill--ghost" type="button" onClick={() => changePage(meta.page + 1)} disabled={loading || meta.page >= totalPages}>
            Sau
          </button>
        </div>
      </div>

      {selected && (
        <ChangeDetailModal
          row={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onRevert={() => onRevert(selected)}
        />
      )}
    </div>
  );
};

const ChangeDetailModal = ({ row, busy, onClose, onRevert }) => {
  const diff = diffValues(row.old_value, row.new_value);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-header border-bottom-0 pb-0">
              <div>
                <h5 className="modal-title fw-bold">{row.action_label || actionLabel(row.action)}</h5>
                <div className="caption text-secondary">{row.target_table} - {row.target_label}</div>
              </div>
              {/* 📌 [SWIMLANE L3-B2 | STT 8] Button: ✕ btn-close (modal chi tiết)
                   Loại: <button class="btn-close"> | Dòng gốc: L255
                   Action: onClick → onClose → setSelected(null)
                   State: disabled khi busy=true (đang thực hiện hoàn tác) */}
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={busy} />
            </div>
            <div className="modal-body">
              <div className="caption text-secondary mb-3">
                {formatDateTime(row.created_at)} - bởi <strong>{row.actor}</strong>
              </div>
              <table className="admin-table">
                <thead><tr><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead>
                <tbody>
                  {diff.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-secondary">
                        Log này không có dữ liệu trước/sau để hiển thị.
                      </td>
                    </tr>
                  ) : (
                    diff.map((item) => (
                      <tr key={item.field} className={item.changed ? 'row--suspicious' : ''}>
                        <td className="fw-semibold">{item.field}</td>
                        <td className="text-secondary"><code>{displayValue(item.before)}</code></td>
                        <td><code>{displayValue(item.after)}</code></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {row.reverted && <div className="api-success-message mt-3">Thay đổi này đã được hoàn tác.</div>}
            </div>
            <div className="modal-footer border-top-0 pt-0">
              {/* 📌 [SWIMLANE L3-B2 | STT 9] Button: Đóng (modal footer)
                   Loại: <button class="btn-pill--ghost"> | Dòng gốc: L284
                   Action: onClick → onClose → setSelected(null)
                   State: disabled khi busy=true */}
              <button type="button" className="btn-pill btn-pill--ghost" onClick={onClose} disabled={busy}>Đóng</button>
              {row.revertable && !row.reverted && (
                {/* 📌 [SWIMLANE L3-B2 | STT 10] Button: Hoàn tác thay đổi ⭐
                     Loại: <button class="btn-pill--dark"> | Dòng gốc: L286–L288
                     Hiển thị: CHỈ khi row.revertable=true && row.reverted=false
                     Action: onClick → onRevert(row) → revertChange(row.id) → POST /admin/logs/:id/undo
                     Swimlane ⭐: Backend dùng SELECT FOR UPDATE (Pessimistic Lock) → chống Race Condition
                                  + xác thực giá trị (Optimistic Check) → nếu sai → 409 Conflict
                     UI: khi busy → hiện 'Đang hoàn tác...' | bình thường → 'Hoàn tác thay đổi' */}
                <button type="button" className="btn-pill btn-pill--dark" onClick={onRevert} disabled={busy}>
                  {busy ? 'Đang hoàn tác...' : 'Hoàn tác thay đổi'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminChangeLogPage;
