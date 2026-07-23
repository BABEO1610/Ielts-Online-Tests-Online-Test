-- Migration: Add target_test_date to users (T003)
-- Description: Cho phép lưu lại ngày học viên dự định thi thật.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS target_test_date DATE;
