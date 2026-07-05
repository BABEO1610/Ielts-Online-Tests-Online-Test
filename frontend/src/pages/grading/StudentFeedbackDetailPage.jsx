import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FeedbackReport from '../../components/grading/FeedbackReport';
import gradingService from '../../services/grading.service';

const StudentFeedbackDetailPage = () => {
  const { submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [type, setType] = useState(location.state?.type || searchParams.get('type') || '');
  const [loadingType, setLoadingType] = useState(!type);

  useEffect(() => {
    if (type) return undefined;

    let cancelled = false;
    const resolveType = async () => {
      setLoadingType(true);
      try {
        const response = await gradingService.getSubmissionHistory();
        const match = response?.data?.find(item => item.id === submissionId);
        if (!cancelled) setType(match?.type || 'writing');
      } catch {
        if (!cancelled) setType('writing');
      } finally {
        if (!cancelled) setLoadingType(false);
      }
    };

    resolveType();
    return () => {
      cancelled = true;
    };
  }, [submissionId, type]);

  return (
    <div className="bg-white pb-5">
      <main className="container-fluid px-3 px-md-4 pt-4" style={{ maxWidth: '1180px' }}>
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <button
            type="button"
            className="btn btn-light rounded-pill px-4 fw-medium"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </button>
          <h1 className="h3 fw-bold mb-0">Chi tiết bài làm</h1>
        </div>

        {loadingType ? (
          <div className="alert alert-light border">Đang tải dữ liệu...</div>
        ) : (
          <FeedbackReport submissionId={submissionId} type={type || 'writing'} />
        )}
      </main>
    </div>
  );
};

export default StudentFeedbackDetailPage;
