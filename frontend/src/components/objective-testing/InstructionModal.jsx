/**
 * InstructionModal.jsx — Task 4.2.1
 * Modal Hướng dẫn trước khi thi
 * 
 * Popup hiện lên khi bấm "Bắt đầu thi". Yêu cầu xác nhận mới cho vào.
 * Dùng Bootstrap modal chuẩn, backdrop="static" (không đóng khi bấm ra ngoài).
 * 
 * Design: Uber-inspired modal card — rounded-xl, clean typography.
 */
import React from 'react';
import '../../styles/objective-testing.css';

function InstructionModal({ testTitle, duration, questionCount, onConfirm }) {
  return (
    <div
      className="modal fade modal-uber"
      id="instructionModal"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabIndex="-1"
      aria-labelledby="instructionModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="display-sm" id="instructionModalLabel">
              Before you begin
            </h5>
          </div>
          <div className="modal-body">
            <h6 className="body-md-strong mb-3">{testTitle || 'Cambridge IELTS 18 — Reading Test 1'}</h6>

            <div className="d-flex gap-3 mb-4">
              <div className="card-content text-center flex-fill" style={{ padding: 'var(--spacing-lg)' }}>
                <div className="display-sm">{questionCount || 40}</div>
                <div className="caption" style={{ color: 'var(--body)' }}>Questions</div>
              </div>
              <div className="card-content text-center flex-fill" style={{ padding: 'var(--spacing-lg)' }}>
                <div className="display-sm">{duration || 60} min</div>
                <div className="caption" style={{ color: 'var(--body)' }}>Time limit</div>
              </div>
            </div>

            <div style={{ background: 'var(--canvas-soft)', borderRadius: 'var(--rounded-lg)', padding: 'var(--spacing-lg)' }}>
              <p className="body-sm-strong mb-2">Important instructions:</p>
              <ul className="body-sm mb-0" style={{ color: 'var(--body)', paddingLeft: 20 }}>
                <li className="mb-1">The timer will start immediately once you confirm.</li>
                <li className="mb-1">You cannot pause the test once it begins.</li>
                <li className="mb-1">Your progress is auto-saved every 60 seconds.</li>
                <li className="mb-1">The test will be auto-submitted when time expires.</li>
                <li>You can submit early using the "Submit" button.</li>
              </ul>
            </div>
          </div>
          <div className="modal-footer d-flex gap-2">
            <button
              type="button"
              className="button-secondary flex-fill"
              id="btn-cancel-start"
              data-bs-dismiss="modal"
              style={{ border: '1px solid var(--surface-pressed)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button-primary flex-fill"
              id="btn-confirm-start"
              data-bs-dismiss="modal"
              onClick={onConfirm}
            >
              Start test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructionModal;
