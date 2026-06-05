import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import gradingService from '../../services/grading.service';
import { useAuth } from '../../context/AuthContext';

const AudioRecorder = ({ testId, partNumber, onUploadComplete, onSubmitSuccess, maxDuration = 300 }) => {
  const { user } = useAuth();
  const aiQuotaRemaining = user?.ai_grading_quota_remaining ?? 0;

  const [status, setStatus] = useState('idle'); // idle, recording, uploading, done, error
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [grader, setGrader] = useState('tutor');
  const [tempS3Key, setTempS3Key] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSupportedMimeType = () => {
    const types = ['audio/mp4', 'audio/webm', 'audio/ogg'];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return ''; // default
  };

  const startRecording = async () => {
    setErrorMsg(null);
    setSubmitStatus('idle');
    try {
      // EARS[Event]: WHEN user starts recording, THE system SHALL request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // EARS[Event]: WHEN recording stops, THE system SHALL process the audio chunks
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await uploadAudio(finalBlob);
      };

      mediaRecorder.start();
      setStatus('recording');
      setTimeLeft(maxDuration);

      // EARS[State-driven]: WHILE recording, THE system SHALL automatically stop recording WHEN maxDuration is reached
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      // EARS[Unwanted]: WHERE browser denies microphone permission, THE system SHALL show error
      setStatus('error');
      setErrorMsg('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  const uploadAudio = async (blob) => {
    setStatus('uploading');
    try {
      const formData = new FormData();
      // EARS[Event]: WHEN user submits audio, THE system SHALL upload the file
      formData.append('audio_file', blob, 'recording.m4a'); 

      const response = await api.post('/submissions/speaking/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success && response.data?.data?.temp_s3_key) {
        setStatus('done');
        setTempS3Key(response.data.data.temp_s3_key);
        if (onUploadComplete) {
          onUploadComplete(response.data.data.temp_s3_key);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      setStatus('error');
      // EARS[Unwanted]: WHERE file is invalid or too large, THE system SHALL display error message
      if (error.response) {
        if (error.response.status === 413) {
          // GRD_UPL_002
          setErrorMsg(error.response.data?.error?.message || 'File too large (Max 50MB) or exceeds 5 minutes.');
        } else if (error.response.status === 400) {
          // GRD_UPL_001
          setErrorMsg(error.response.data?.error?.message || 'Invalid file format. Accepted: MP3, WAV, M4A.');
        } else {
          setErrorMsg('Upload failed. Please try again.');
        }
      } else {
        setErrorMsg('Upload failed. Please try again.');
      }
    } finally {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (grader === 'ai' && aiQuotaRemaining <= 0) return;

    try {
      setSubmitStatus('submitting');
      setErrorMsg(null);
      
      const payload = {
        test_id: testId,
        part_number: partNumber,
        temp_s3_key: tempS3Key,
        grader: grader
      };
      
      const response = await gradingService.submitSpeaking(payload);
      setSubmitStatus('success');
      if (onSubmitSuccess) {
        onSubmitSuccess(response);
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMsg(error.response?.data?.error?.message || 'Nộp bài thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="card-content bg-light p-4 rounded-4 text-center shadow-sm">
      <h3 className="mb-3" style={{ fontWeight: 700 }}>Speaking Submission</h3>
      
      {status === 'idle' && (
        <div>
          <p className="text-muted">Click the button below to start recording. Max duration: {formatTime(maxDuration)}</p>
          <button 
            className="btn btn-dark rounded-pill px-4 py-2" 
            onClick={startRecording}
            data-testid="start-recording-btn"
          >
            Start Recording
          </button>
        </div>
      )}

      {status === 'recording' && (
        <div>
          <div className="text-danger mb-3 fw-bold">
            <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
            Recording... {formatTime(timeLeft)}
          </div>
          <button 
            className="btn btn-light rounded-pill border px-4 py-2" 
            onClick={stopRecording}
            data-testid="stop-recording-btn"
          >
            Stop Recording
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div>
          <div className="spinner-border text-dark mb-3" role="status">
            <span className="visually-hidden">Uploading...</span>
          </div>
          <p className="fw-bold">Uploading audio...</p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-success slide-in">
          <i className="bi bi-check-circle-fill fs-1"></i>
          <p className="mt-2 fw-bold">Thu âm thành công!</p>
        </div>
      )}

      {status === 'error' && submitStatus === 'idle' && (
        <div className="text-danger fade-in">
          <p className="fw-bold" data-testid="error-message">{errorMsg}</p>
          <button 
            className="btn btn-dark rounded-pill px-4 py-2 mt-2" 
            onClick={() => { setStatus('idle'); setErrorMsg(null); }}
            data-testid="retry-btn"
          >
            Try Again
          </button>
        </div>
      )}
      {/* Conditional Rendering: Submit Form appears only after successful upload */}
      {status === 'done' && (
        <div className="submit-section fade-in mt-4 text-start">
          <hr className="my-4" />
          <form onSubmit={handleSubmit}>
            <div className="d-flex align-items-center mb-3 flex-wrap">
              <strong className="me-3 mb-2">Chọn người chấm:</strong>
              <div className="form-check form-check-inline mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  name="graderOptions"
                  id="graderTutor"
                  value="tutor"
                  checked={grader === 'tutor'}
                  onChange={(e) => setGrader(e.target.value)}
                  disabled={submitStatus === 'submitting' || submitStatus === 'success'}
                />
                <label className="form-check-label" htmlFor="graderTutor">
                  Giáo viên (Tutor)
                </label>
              </div>
              <div className="form-check form-check-inline mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  name="graderOptions"
                  id="graderAi"
                  value="ai"
                  checked={grader === 'ai'}
                  onChange={(e) => setGrader(e.target.value)}
                  disabled={submitStatus === 'submitting' || submitStatus === 'success' || aiQuotaRemaining <= 0}
                />
                <label className="form-check-label" htmlFor="graderAi">
                  AI Chấm điểm <span className="badge bg-info text-dark ms-1">Còn {aiQuotaRemaining} lượt</span>
                </label>
              </div>
            </div>

            {aiQuotaRemaining <= 0 && (
              <p className="text-danger small mb-3 fade-in">
                Bạn đã hết lượt chấm chữa bằng AI. Vui lòng chọn Giảng viên hoặc mua thêm gói.
              </p>
            )}

            {submitStatus === 'error' && (
              <div className="alert alert-danger py-2 fade-in" role="alert">
                {errorMsg}
              </div>
            )}
            
            {submitStatus === 'success' && (
              <div className="alert alert-success py-2 fade-in" role="alert">
                Nộp bài thành công!
              </div>
            )}

            <div className="text-center mt-4">
              <button 
                type="submit" 
                className="btn btn-primary rounded-pill px-5 py-2 fw-bold"
                disabled={submitStatus === 'submitting' || submitStatus === 'success' || (grader === 'ai' && aiQuotaRemaining <= 0)}
              >
                {submitStatus === 'submitting' ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang nộp...</>
                ) : (
                  'Nộp bài'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
