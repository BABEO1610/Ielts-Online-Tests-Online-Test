-- Migration: Bảng writing_submissions và speaking_submissions
-- Description: Thêm cột assigned_tutor_id để quản lý giảng viên chấm bài cho từng submission

ALTER TABLE writing_submissions ADD COLUMN assigned_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_writing_submissions_assigned_tutor ON writing_submissions(assigned_tutor_id);

ALTER TABLE speaking_submissions ADD COLUMN assigned_tutor_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_speaking_submissions_assigned_tutor ON speaking_submissions(assigned_tutor_id);
