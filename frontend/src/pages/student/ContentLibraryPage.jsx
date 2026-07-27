import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import StudentNavbar from '../../components/layout/StudentNavbar';
import html2pdf from 'html2pdf.js';
import Pagination from '../../components/common/Pagination';
import { fetchLibraryResources } from '../../services/library.service';

// ─── Constants ───────────────────────────────────────────────────────────────
const SKILL_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pdf', label: 'PDF / Sách' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Khác' },
];

const SKILL_BADGE = {
  reading: 'text-bg-primary',
  listening: 'text-bg-success',
  writing: 'text-bg-warning',
  speaking: 'text-bg-info',
};

const LEVEL_BADGE = {
  'Dễ': 'text-bg-success',
  'Trung bình': 'text-bg-warning',
  'Khó': 'text-bg-danger',
};

// ─── Modal sub-renders by skill ───────────────────────────────────────────────
const ReadingPreview = ({ content }) => (
  <div>
    {content.passages.map((passage, pi) => (
      <div key={pi} className="mb-4">
        <h6 className="fw-bold text-primary mb-2">{passage.title}</h6>
        {/* Passage text */}
        <div
          className="bg-light rounded-3 p-3 mb-3"
          style={{ maxHeight: '260px', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.7' }}
        >
          {passage.body.split('\n').map((para, i) => (
            <p key={i} className="mb-2" style={{ pageBreakInside: 'avoid' }}>{para}</p>
          ))}
        </div>
        {/* Questions */}
        {passage.questions.map((qSet, qi) => (
          <div key={qi} className="mb-3">
            <p className="fw-semibold text-dark small mb-2">{qSet.instruction}</p>
            {qSet.type === 'TRUE_FALSE_NG' && (
              <ol start={qSet.items[0].num} className="ps-3">
                {qSet.items.map((item) => (
                  <li key={item.num} className="mb-1 small">
                    {item.text}
                    <span className="ms-2 badge text-bg-secondary">{item.answer}</span>
                  </li>
                ))}
              </ol>
            )}
            {qSet.type === 'MULTIPLE_CHOICE' && (
              <div>
                {qSet.items.map((item) => (
                  <div key={item.num} className="mb-2">
                    <p className="mb-1 small fw-medium">{item.num}. {item.text}</p>
                    {item.options.map((opt) => (
                      <div key={opt.key} className={`small ps-3 py-1 rounded ${opt.key === item.answer ? 'text-success fw-semibold' : 'text-muted'}`}>
                        {opt.key}. {opt.text} {opt.key === item.answer && '✓'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
);

const ListeningPreview = ({ content }) => (
  <div>
    <div className="alert alert-info border-0 small mb-3 d-flex align-items-center gap-2">
      <i className="bi bi-headphones fs-5"></i>
      <span>File audio đính kèm khi tải đề. Preview hiển thị câu hỏi để bạn làm quen trước.</span>
    </div>
    {content.sections.map((section, si) => (
      <div key={si} className="mb-4">
        <h6 className="fw-bold text-success mb-1">{section.title}</h6>
        <p className="text-muted small mb-2">{section.context}</p>
        {section.questions.map((qSet, qi) => (
          <div key={qi}>
            <p className="fw-semibold text-dark small mb-2">{qSet.instruction}</p>
            {qSet.type === 'FORM_COMPLETION' && (
              <table className="table table-sm table-bordered small">
                <thead className="table-light">
                  <tr><th colSpan={2} className="text-center">{qSet.form.title}</th></tr>
                </thead>
                <tbody>
                  {qSet.form.fields.map((field) => (
                    <tr key={field.num}>
                      <td className="fw-medium" style={{ width: '40%' }}>{field.num}. {field.label}</td>
                      <td className="text-muted fst-italic">{field.value} <span className="ms-2 badge text-bg-secondary">{field.answer}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {qSet.type === 'MULTIPLE_CHOICE' && (
              <div>
                {qSet.items.map((item) => (
                  <div key={item.num} className="mb-2">
                    <p className="mb-1 small fw-medium">{item.num}. {item.text}</p>
                    {item.options.map((opt) => (
                      <div key={opt.key} className={`small ps-3 py-1 rounded ${(Array.isArray(item.answer) ? item.answer.includes(opt.key) : item.answer === opt.key)
                        ? 'text-success fw-semibold' : 'text-muted'
                        }`}>
                        {opt.key}. {opt.text}{' '}
                        {(Array.isArray(item.answer) ? item.answer.includes(opt.key) : item.answer === opt.key) && '✓'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
);

const WritingPreview = ({ content }) => (
  <div>
    {content.tasks.map((task) => (
      <div key={task.taskNum} className="mb-5">
        <h6 className="fw-bold text-warning-emphasis mb-2">{task.title}</h6>

        {/* Chart data table nếu có */}
        {task.chartDescription && (
          <div className="mb-3">
            <p className="small text-muted mb-1 fw-semibold">{task.chartDescription.title} ({task.chartDescription.unit})</p>
            <table className="table table-sm table-bordered small">
              <thead className="table-warning">
                <tr>
                  <th>Source</th>
                  {Object.keys(task.chartDescription.data[0].values).map((yr) => (
                    <th key={yr}>{yr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {task.chartDescription.data.map((row) => (
                  <tr key={row.source}>
                    <td className="fw-medium">{row.source}</td>
                    {Object.values(row.values).map((v, i) => <td key={i}>{v.toLocaleString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-start border-3 border-warning ps-3 mb-3">
          <div className="small mb-0">
            {task.prompt.split('\n').map((para, i) => (
              <p key={i} className="mb-1" style={{ pageBreakInside: 'avoid' }}>{para}</p>
            ))}
          </div>
        </div>
        <p className="text-muted small fst-italic mb-3">{task.instruction}</p>

        {/* Band descriptors */}
        <div className="mb-3">
          <p className="small fw-semibold text-dark mb-1">Band descriptors:</p>
          {Object.entries(task.bandDescriptors).map(([band, desc]) => (
            <div key={band} className="small text-muted mb-1">
              <span className="badge text-bg-dark me-2">Band {band}</span>{desc}
            </div>
          ))}
        </div>

        {/* Sample Answer */}
        <details className="mb-2">
          <summary className="fw-semibold small text-primary" style={{ cursor: 'pointer' }}>
            Xem bài mẫu Band 7+ ▾
          </summary>
          <div
            className="bg-light rounded-3 p-3 mt-2 small"
            style={{ lineHeight: '1.7', maxHeight: '280px', overflowY: 'auto' }}
          >
            {task.sampleAnswer.split('\n').map((para, i) => (
              <p key={i} className="mb-2" style={{ pageBreakInside: 'avoid' }}>{para}</p>
            ))}
          </div>
        </details>
      </div>
    ))}
  </div>
);

const SpeakingPreview = ({ content }) => (
  <div>
    {/* Part 1 */}
    <div className="mb-4">
      <h6 className="fw-bold text-info mb-2">{content.part1.title}</h6>
      {content.part1.topics.map((topic, ti) => (
        <div key={ti} className="mb-3">
          <p className="small fw-semibold text-dark mb-1">Topic: {topic.topic}</p>
          <ul className="small text-muted ps-3">
            {topic.questions.map((q, qi) => <li key={qi} className="mb-1">{q}</li>)}
          </ul>
        </div>
      ))}
    </div>

    {/* Part 2 */}
    <div className="mb-4">
      <h6 className="fw-bold text-info mb-2">{content.part2.title}</h6>
      <div className="border rounded-3 p-3 bg-light mb-3">
        <p className="fw-semibold text-dark small mb-2">{content.part2.cueCard.prompt}</p>
        <p className="text-muted small mb-1">You should say:</p>
        <ul className="small text-muted ps-3 mb-2">
          {content.part2.cueCard.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <p className="small text-muted fst-italic mb-0">⏱ {content.part2.cueCard.timeToPrep}</p>
      </div>
      <details>
        <summary className="fw-semibold small text-primary" style={{ cursor: 'pointer' }}>
          Xem bài mẫu Band 7+ ▾
        </summary>
        <div
          className="bg-white rounded-3 border p-3 mt-2 small"
          style={{ lineHeight: '1.7', maxHeight: '240px', overflowY: 'auto' }}
        >
          {content.part2.sampleAnswer.split('\n').map((para, i) => (
            <p key={i} className="mb-2" style={{ pageBreakInside: 'avoid' }}>{para}</p>
          ))}
        </div>
      </details>
    </div>

    {/* Part 3 */}
    <div className="mb-2">
      <h6 className="fw-bold text-info mb-2">{content.part3.title}</h6>
      {content.part3.questions.map((item, qi) => (
        <div key={qi} className="mb-3 border-start border-3 border-info ps-3">
          <p className="small fw-semibold text-dark mb-1">{qi + 1}. {item.q}</p>
          <p className="small text-muted mb-0">💡 Band 7 tip: {item.bandSevenTip}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─── Test Preview Modal ───────────────────────────────────────────────────────
const TestPreviewModal = ({ test, onClose, onDownload, downloadingId }) => {
  const contentRef = useRef(null);

  if (!test) return null;

  const getFullUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:3000';
    return `${baseUrl}${path}`;
  };

  const renderContent = () => {
    if (test.resource_type === 'pdf' && test.file_url) {
      return (
        <div style={{ height: '70vh' }}>
          <iframe
            src={getFullUrl(test.file_url)}
            width="100%"
            height="100%"
            title={test.title}
            style={{ border: 'none' }}
          />
        </div>
      );
    }

    if (test.resource_type === 'audio' && test.file_url) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-music-note-beamed text-muted mb-4 d-block" style={{ fontSize: '64px' }}></i>
          <audio controls src={getFullUrl(test.file_url)} className="w-100" />
        </div>
      );
    }

    const { content } = test;
    if (!content) return <p className="text-muted text-center py-4">Nội dung đang được cập nhật.</p>;
    switch (content.type) {
      case 'reading': return <ReadingPreview content={content} />;
      case 'listening': return <ListeningPreview content={content} />;
      case 'writing': return <WritingPreview content={content} />;
      case 'speaking': return <SpeakingPreview content={content} />;
      default: return null;
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      data-testid="test-preview-modal"
    >
      <div
        className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-0 rounded-4 shadow-lg">
          {/* Header */}
          <div className="modal-header border-0 pb-0 pt-4 px-4">
            <div>
              <div className="d-flex gap-2 mb-2">
                <span className={`badge rounded-pill ${SKILL_BADGE[test.skill]} text-capitalize`}>{test.skill}</span>
                <span className={`badge rounded-pill ${LEVEL_BADGE[test.level]}`}>{test.level}</span>
              </div>
              <h5 className="modal-title fw-bold text-dark mb-0">{test.title}</h5>
            </div>
            <button className="btn-close ms-auto" onClick={onClose} aria-label="Đóng"></button>
          </div>

          {/* Stats row */}
          <div className="px-4 pt-3 pb-2">
            <div className="row g-2">
              {[
                { icon: 'bi-question-circle', val: test.questions, label: 'Câu hỏi' },
                { icon: 'bi-clock', val: test.duration, label: 'Thời gian' },
                { icon: 'bi-list-ol', val: `${test.parts.length} phần`, label: 'Sections' },
              ].map((s) => (
                <div key={s.label} className="col-4">
                  <div className="bg-light rounded-3 p-2 text-center">
                    <i className={`bi ${s.icon} text-muted small`}></i>
                    <div className="fw-bold text-dark">{s.val}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Body — actual content */}
          <div className="modal-body px-4 pt-2 pb-3" ref={contentRef} id="pdf-content-container">
            <hr className="my-3" />
            {/* Thêm header cho file PDF để khi xuất ra trông chuyên nghiệp hơn */}
            <div className="d-none d-print-block mb-4 text-center">
              <h2 className="fw-bold">{test.title}</h2>
              <p className="text-muted">{test.skill.toUpperCase()} - {test.level}</p>
            </div>
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-2 flex-wrap">
            <button className="btn btn-light rounded-pill px-4" onClick={onClose}>Đóng</button>
            <button
              className="btn btn-outline-danger rounded-pill px-4 d-flex align-items-center gap-2"
              onClick={() => { onDownload(test.id, 'pdf', test.title, contentRef.current); }}
              disabled={!!downloadingId}
              data-testid={`modal-btn-pdf-${test.id}`}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i> Tải PDF ({test.pdfSize})
            </button>
            {test.audioSize && (
              <button
                className="btn btn-dark rounded-pill px-4 d-flex align-items-center gap-2"
                onClick={() => { onDownload(test.id, 'audio', test.title); onClose(); }}
                disabled={!!downloadingId}
                data-testid={`modal-btn-audio-${test.id}`}
              >
                <i className="bi bi-music-note-beamed"></i> Tải Audio ({test.audioSize})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ContentLibraryPage = () => {
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeSkill, setActiveSkill] = useState(''); // Thực ra là activeResourceType
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const [previewTest, setPreviewTest] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSkill]);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const res = await fetchLibraryResources({ search: searchQuery, resource_type: activeSkill });
        if (res.success) {
          const mapped = res.data.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            skill: item.resource_type === 'audio' ? 'listening' : 'reading', // fake skill for badge UI
            level: 'Trung bình', // fake level for badge UI
            parts: [item.resource_type === 'audio' ? 'Audio file' : 'Document'],
            questions: 0,
            duration: 'N/A',
            pdfSize: item.resource_type === 'pdf' ? (item.file_size_bytes / 1024 / 1024).toFixed(1) + ' MB' : null,
            audioSize: item.resource_type === 'audio' ? (item.file_size_bytes / 1024 / 1024).toFixed(1) + ' MB' : null,
            content: null,
            file_url: item.file_url,
            resource_type: item.resource_type,
            category: item.category
          }));
          setResources(mapped);
        }
      } catch (err) {
        toast.error('Lỗi khi tải danh sách tài liệu');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchResources();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeSkill]);

  const handleDownload = async (id, type, title, sourceElement = null) => {
    if (downloadingId) return;
    setDownloadingId(`${id}-${type}`);
    const toastId = toast.loading(`Đang tải ${type.toUpperCase()}...`);

    try {
      const test = resources.find(r => r.id === id);
      if (!test || !test.file_url) {
        throw new Error('Không tìm thấy đường dẫn file');
      }

      const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:3000';
        return `${baseUrl}${path}`;
      };

      // Fetch blob để ép tải xuống với đúng định dạng (tránh tải nhầm file .htm do CORS)
      const response = await fetch(getFullUrl(test.file_url));
      if (!response.ok) throw new Error('Không thể fetch file');
      const blob = await response.blob();

      const ext = type === 'pdf' ? '.pdf' : '.mp3';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Tải file thành công!`, { id: toastId });
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Có lỗi khi tải file, thử lại sau.`, { id: toastId });
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.ceil(resources.length / ITEMS_PER_PAGE);
  const paginatedResources = resources.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="bg-light min-vh-100" data-testid="library-page">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {previewTest && (
        <TestPreviewModal
          test={previewTest}
          onClose={() => setPreviewTest(null)}
          onDownload={handleDownload}
          downloadingId={downloadingId}
        />
      )}

      <StudentNavbar />

      <div className="container py-5">
        {/* Header */}
        <div className="mb-4">
          <h1 className="fw-bold text-dark mb-1">Library</h1>
          <p className="text-muted mb-0">Kho tài liệu luyện thi IELTS (PDF & Audio) — xem đề trước, tải về sau.</p>
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-4 shadow-sm p-3 mb-4 d-flex flex-column flex-md-row gap-3 align-items-md-center">
          <div className="input-group" style={{ maxWidth: '360px' }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
            />
            {searchQuery && (
              <button className="btn btn-outline-secondary border-start-0" type="button" onClick={() => setSearchQuery('')} aria-label="Xóa">
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>

          <div className="d-flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {SKILL_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`btn btn-sm rounded-pill px-3 fw-medium text-nowrap ${activeSkill === f.value ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setActiveSkill(f.value)}
                data-testid={`filter-${f.value || 'all'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-muted small ms-md-auto text-nowrap">{loading ? 'Đang tải...' : `${resources.length} tài liệu`}</span>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Đang tải tài liệu...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white" data-testid="empty-state">
            <i className="bi bi-search text-muted mb-3" style={{ fontSize: '48px' }}></i>
            <h5 className="fw-bold text-dark">Không tìm thấy tài liệu</h5>
            <p className="text-muted mb-3">
              {searchQuery ? `Không có kết quả cho "${searchQuery}".` : 'Không có tài liệu nào trong danh mục này.'}
            </p>
            <div>
              <button className="btn btn-dark btn-sm rounded-pill px-4" onClick={() => { setSearchQuery(''); setActiveSkill(''); }}>
                Xem tất cả
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4" data-testid="test-list">
              {paginatedResources.map((test) => (
                <div className="col" key={test.id} data-testid={`test-item-${test.id}`}>
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex gap-2">
                          <span className={`badge rounded-pill ${SKILL_BADGE[test.skill]} text-capitalize`}>{test.resource_type}</span>
                          <span className={`badge rounded-pill text-bg-secondary`}>{test.category || 'Tài liệu'}</span>
                        </div>
                        <span className="text-muted small">{test.resource_type === 'pdf' ? 'PDF' : 'Audio'}</span>
                      </div>

                      <h5 className="card-title fw-bold text-dark mb-2">{test.title}</h5>
                      <p className="card-text text-muted small flex-grow-1 mb-4">{test.description}</p>

                      <div className="d-flex flex-column gap-2 mt-auto">
                        <button
                          className="btn btn-dark w-100 d-flex align-items-center justify-content-center gap-2 fw-medium rounded-pill"
                          onClick={() => setPreviewTest(test)}
                          data-testid={`btn-view-${test.id}`}
                        >
                          Thông tin chi tiết →
                        </button>
                        <div className="d-flex gap-2">
                          {test.resource_type === 'pdf' ? (
                            <button
                              className="btn btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1 fw-medium"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = test.file_url;
                                link.setAttribute('download', test.title);
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode.removeChild(link);
                              }}
                              data-testid={`btn-download-pdf-${test.id}`}
                            >
                              <i className="bi bi-file-earmark-pdf-fill"></i> Tải PDF
                            </button>
                          ) : test.resource_type === 'audio' ? (
                            <button
                              className="btn btn-outline-secondary flex-grow-1 d-flex align-items-center justify-content-center gap-1 fw-medium"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = test.file_url;
                                link.setAttribute('download', test.title);
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode.removeChild(link);
                              }}
                              data-testid={`btn-download-audio-${test.id}`}
                            >
                              <i className="bi bi-music-note-beamed"></i> Tải Audio
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline-info flex-grow-1 d-flex align-items-center justify-content-center gap-1 fw-medium"
                              onClick={() => {
                                window.open(test.file_url, '_blank');
                              }}
                            >
                              <i className="bi bi-download"></i> Tải file
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {resources.length > 0 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentLibraryPage;
