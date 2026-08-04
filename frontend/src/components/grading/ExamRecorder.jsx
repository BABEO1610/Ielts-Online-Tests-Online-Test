import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import gradingService from '../../services/grading.service';

/**
 * ExamRecorder - Component ghi âm đơn giản, tự động chạy.
 * @param {number} maxDuration - Thời gian tối đa (giây).
 * @param {Function} onUploadComplete - Callback khi upload xong: (tempS3Key, durationSeconds) => void
 * @param {Function} onUploadError - Callback khi lỗi upload
 */
const ExamRecorder = forwardRef(({ partNumber, maxDuration = 45, onUploadComplete, onUploadError, hideTimer = false, hideStopButton = false }, ref) => {
  const [status, setStatus] = useState('initializing'); // initializing, recording, uploading, done, error
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const durationRef = useRef(0);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(false);
  const uploadOnStopRef = useRef(true);

  // Auto-start recording on mount
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    uploadOnStopRef.current = true;
    const initRecording = async () => {
      // Hàm khởi tạo và bắt đầu quá trình thu âm (kết nối microphone, tạo MediaRecorder)
      try {
        const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : null;
        if (!mimeType) {
          throw new Error('UNSUPPORTED_RECORDER_MIME');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (!uploadOnStopRef.current) return;
          const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const measuredMs = Math.max(1, Math.round(performance.now() - startedAtRef.current));
          await uploadAudio(finalBlob, measuredMs);
        };

        mediaRecorder.start();
        startedAtRef.current = performance.now();
        setStatus('recording');
        
        timerRef.current = setInterval(() => {
          if (!mounted) return;
          durationRef.current += 1;
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              stopRecording();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!mounted) return;
        setStatus('error');
        const message = err.message === 'UNSUPPORTED_RECORDER_MIME'
          ? 'Trình duyệt chưa hỗ trợ audio/mp4 đã được phê duyệt; không thể âm thầm đổi WebM thành M4A.'
          : 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.';
        if (onUploadError) onUploadError(message);
      }
    };

    initRecording();

    return () => {
      mounted = false;
      mountedRef.current = false;
      uploadOnStopRef.current = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hàm dọn dẹp bộ nhớ: Ngắt kết nối microphone và dừng các timer đang chạy ngầm
  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  useImperativeHandle(ref, () => ({
    stopRecording
  }));

  // Hàm dừng ghi âm chủ động (khi người dùng bấm nút "Hoàn thành" hoặc hết giờ)
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  // Hàm đóng gói file ghi âm (Blob) và gửi lên backend/storage để lấy upload_token
  const uploadAudio = async (blob, durationMs) => {
    if (mountedRef.current) setStatus('uploading');
    try {
      const response = await gradingService.uploadAudio(blob, { partNumber, durationMs });
      if (response?.success && response?.data?.upload_token) {
        if (mountedRef.current) setStatus('done');
        if (onUploadComplete) {
          onUploadComplete(response.data.upload_token, Math.ceil(durationMs / 1000));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      if (mountedRef.current) setStatus('error');
      const msg = error.response?.data?.error?.message || 'Upload failed. Please try again.';
      if (onUploadError) onUploadError(msg);
    } finally {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="text-center">
      {status === 'initializing' && (
        <div className="text-muted fade-in">
          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
          Đang khởi tạo microphone...
        </div>
      )}

      {status === 'recording' && (
        <div className="fade-in">
          <div className="text-danger mb-3 fw-bold fs-5">
            <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
            {hideTimer ? 'Đang ghi âm...' : `Đang ghi âm... ${formatTime(timeLeft)}`}
          </div>
          {!hideStopButton && (
            <button 
              className="btn btn-outline-dark rounded-pill px-4 py-2 fw-medium" 
              onClick={stopRecording}
            >
              Hoàn thành câu trả lời
            </button>
          )}
        </div>
      )}

      {status === 'uploading' && (
        <div className="fade-in">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="fw-bold text-muted">Đang lưu audio...</p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-success fade-in">
          <i className="bi bi-check-circle-fill fs-3 mb-2 d-block"></i>
          <p className="fw-bold mb-0">Đã lưu thành công</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-danger fade-in">
          <i className="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
          <p className="fw-bold mb-0">Lỗi ghi âm / upload</p>
        </div>
      )}
    </div>
  );
});

export default ExamRecorder;
