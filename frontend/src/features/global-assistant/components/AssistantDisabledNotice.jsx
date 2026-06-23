import { AlertCircle } from 'lucide-react';

const AssistantDisabledNotice = () => (
  <div className="assistant-disabled-notice" role="status">
    <AlertCircle size={18} aria-hidden="true" />
    <span>Trợ lý IELTS không khả dụng trong lúc làm bài.</span>
  </div>
);

export default AssistantDisabledNotice;
