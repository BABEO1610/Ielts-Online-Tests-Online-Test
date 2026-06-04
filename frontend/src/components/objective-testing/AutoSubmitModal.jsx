/**
 * AutoSubmitModal.jsx — Task 4.2.7
 * Modal Nộp bài tự động
 * 
 * Khi hết giờ, tự mở Modal chặn mọi thao tác, xoay spinner "Đang nộp...".
 * Modal không cho đóng, có spinner-border text-primary.
 * 
 * Design: Uber-inspired modal, static backdrop, spinner.
 */
import React from 'react';
import '../../styles/objective-testing.css';

function AutoSubmitModal({ isOpen }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop show"
        style={{ zIndex: 1060, background: 'rgba(0,0,0,0.7)' }}
      />
      {/* Modal */}
      <div
        className="modal show d-block modal-uber"
        id="autoSubmitModal"
        tabIndex="-1"
        style={{ zIndex: 1070 }}
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content text-center" style={{ padding: 'var(--spacing-3xl)' }}>
            <div className="mb-4">
              <div
                className="spinner-border"
                role="status"
                style={{ width: 48, height: 48, borderWidth: 4, color: 'var(--ink)' }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <h5 className="display-sm mb-2">Time is up!</h5>
            <p className="body-md" style={{ color: 'var(--body)' }}>
              Đang nộp bài của bạn...
            </p>
            <p className="caption" style={{ color: 'var(--mute)' }}>
              Please do not close this window.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default AutoSubmitModal;
