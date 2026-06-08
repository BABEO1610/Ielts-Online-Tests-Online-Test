/**
 * AuditLogPage.jsx — Task 4.4.4
 * Trang Audit Logs (Admin View)
 * 
 * Bảng liệt kê: Ai, làm gì, khi nào, dữ liệu cũ/mới. Form filter mạnh.
 * table-responsive, table-sm, JSON trong block pre code.
 * Design: Uber-inspired data table with audit JSON blocks.
 */
import React, { useState } from 'react';
import '../../styles/objective-testing.css';

const MOCK_LOGS = [
  { id: 'log1', actor: 'tutor@ieltszone.com', action: 'CREATE', target: 'mock_tests', targetId: 'test-001', createdAt: '2026-06-03 10:15:00', ip: '192.168.1.10', oldValue: null, newValue: { title: 'IELTS 18 — Reading Test 1', skill: 'reading', difficulty: 'intermediate' } },
  { id: 'log2', actor: 'tutor@ieltszone.com', action: 'UPDATE', target: 'questions', targetId: 'q-005', createdAt: '2026-06-03 11:30:00', ip: '192.168.1.10', oldValue: { correct_answer: 'A' }, newValue: { correct_answer: 'B' } },
  { id: 'log3', actor: 'admin@ieltszone.com', action: 'SOFT_DELETE', target: 'mock_tests', targetId: 'test-003', createdAt: '2026-06-02 16:45:00', ip: '10.0.0.1', oldValue: { is_active: true }, newValue: { is_active: false } },
  { id: 'log4', actor: 'tutor2@ieltszone.com', action: 'CREATE', target: 'questions', targetId: 'q-041', createdAt: '2026-06-02 09:00:00', ip: '192.168.1.22', oldValue: null, newValue: { question_text: 'What is the main idea of paragraph 3?', type: 'mcq' } },
];

const ACTION_COLORS = {
  CREATE: { bg: '#edf7ed', color: '#1e4620' },
  UPDATE: { bg: '#fff3cd', color: '#856404' },
  SOFT_DELETE: { bg: '#fdf2f2', color: '#e02424' },
};

function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  const filtered = MOCK_LOGS.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (targetFilter && log.target !== targetFilter) return false;
    return true;
  });

  return (
    <div className="container py-4" style={{ maxWidth: 1200 }}>
      <div className="page-heading">
        <h1>Audit logs</h1>
        <p>Track all changes made to tests and questions.</p>
      </div>

      <div className="filter-bar">
        <select id="filter-audit-action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="SOFT_DELETE">SOFT_DELETE</option>
        </select>
        <select id="filter-audit-target" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
          <option value="">All Tables</option>
          <option value="mock_tests">mock_tests</option>
          <option value="questions">questions</option>
        </select>
      </div>

      <div className="card-content p-0" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table tutor-table mb-0" id="audit-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Table</th>
                <th>Target ID</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const ac = ACTION_COLORS[log.action] || {};
                return (
                  <tr key={log.id} id={`audit-row-${log.id}`}>
                    <td className="body-sm" style={{ whiteSpace: 'nowrap' }}>{log.createdAt}</td>
                    <td className="body-sm">{log.actor}</td>
                    <td>
                      <span className="badge-status" style={{ background: ac.bg, color: ac.color, fontWeight: 600 }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="body-sm" style={{ fontFamily: 'monospace' }}>{log.target}</td>
                    <td className="caption" style={{ fontFamily: 'monospace', color: 'var(--body)' }}>{log.targetId}</td>
                    <td>
                      {log.oldValue ? (
                        <div className="audit-json-block"><code>{JSON.stringify(log.oldValue, null, 2)}</code></div>
                      ) : <span className="caption" style={{ color: 'var(--mute)' }}>—</span>}
                    </td>
                    <td>
                      {log.newValue ? (
                        <div className="audit-json-block"><code>{JSON.stringify(log.newValue, null, 2)}</code></div>
                      ) : <span className="caption" style={{ color: 'var(--mute)' }}>—</span>}
                    </td>
                    <td className="caption" style={{ fontFamily: 'monospace', color: 'var(--body)' }}>{log.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditLogPage;
