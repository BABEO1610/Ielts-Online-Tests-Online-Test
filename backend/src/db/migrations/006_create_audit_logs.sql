-- Migration: Bảng `audit_logs`
-- EARS[Ubiquitous]: THE system SHALL log all account state modifications (creation, role changes, deactivation) into the `audit_logs` table.

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Có thể NULL nếu hành động do hệ thống tự thực thi
    action log_action NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id UUID, -- UUID của record bị thay đổi, có thể NULL nếu tác động toàn cục hoặc bảng không dùng UUID
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index cho việc query log dễ dàng (theo actor, action, hoặc target_table)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
