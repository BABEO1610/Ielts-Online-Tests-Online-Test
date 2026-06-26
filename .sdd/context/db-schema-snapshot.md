# DB Schema Snapshot

Generated for agent/runtime alignment on 2026-06-24.

Source of truth: `.sdd/shared_context.md`.

## Tables

### users
- Important columns: `id UUID PK`, `email VARCHAR(255) UNIQUE`, `password_hash TEXT`, `role user_role`, `status account_status`, `full_name VARCHAR(255)`, `avatar_url TEXT`, `target_band_score NUMERIC(3,1)`, `email_verified_at TIMESTAMPTZ`, `must_change_password BOOLEAN`, `last_login_at TIMESTAMPTZ`, `failed_login_attempts SMALLINT`, `locked_until TIMESTAMPTZ`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: parent table for auth, sessions, submissions, attempts, chatbot, audit actor references.

### email_verification_tokens
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `token TEXT UNIQUE`, `expires_at TIMESTAMPTZ`, `used_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`.

### password_reset_tokens
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `token TEXT UNIQUE`, `expires_at TIMESTAMPTZ`, `used_at TIMESTAMPTZ`, `requested_from INET`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`.

### password_history
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `password_hash TEXT`, `reason password_change_reason`, `changed_from_ip INET`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`.

### oauth_accounts
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `provider oauth_provider`, `provider_user_id VARCHAR(255)`, `provider_email VARCHAR(255)`, `access_token TEXT`, `refresh_token TEXT`, `token_expires_at TIMESTAMPTZ`, `raw_profile JSONB`, `linked_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: belongs to `users`; unique provider identity by `(provider, provider_user_id)`.

### user_sessions
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `session_token TEXT UNIQUE`, `ip_address INET`, `user_agent TEXT`, `is_oauth BOOLEAN`, `oauth_provider oauth_provider`, `last_active_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ`, `revoked_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`; source for active session checks.

### contact_submissions
- Important columns: `id UUID PK`, `name VARCHAR(255)`, `email VARCHAR(255)`, `subject VARCHAR(500)`, `message TEXT`, `resolved BOOLEAN`, `created_at TIMESTAMPTZ`.
- Relationships: standalone contact form table.

### mock_tests
- Important columns: `id UUID PK`, `title VARCHAR(500)`, `description TEXT`, `skill skill_type`, `difficulty difficulty`, `duration_minutes INT`, `is_published BOOLEAN`, `publish_at TIMESTAMPTZ`, `created_by UUID FK users(id)`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: has many `questions`, `test_attempts`; optional parent for writing/speaking submissions; created by `users`.

### questions
- Important columns: `id UUID PK`, `test_id UUID FK mock_tests(id)`, `question_order INT`, `question_text TEXT`, `options JSONB`, `correct_answer TEXT`, `explanation TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: belongs to `mock_tests`; has many `question_answers`; used by `ai_explain_requests`.

### test_attempts
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `test_id UUID FK mock_tests(id)`, `mode test_mode`, `started_at TIMESTAMPTZ`, `submitted_at TIMESTAMPTZ`, `band_score NUMERIC(3,1)`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users` and `mock_tests`; has many `question_answers`.

### question_answers
- Important columns: `id UUID PK`, `attempt_id UUID FK test_attempts(id)`, `question_id UUID FK questions(id)`, `given_answer TEXT`, `is_correct BOOLEAN`, `created_at TIMESTAMPTZ`.
- Relationships: joins `test_attempts` to `questions`; unique by `(attempt_id, question_id)`.

### writing_submissions
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `test_id UUID FK mock_tests(id)`, `task_number SMALLINT`, `prompt_text TEXT`, `response_text TEXT`, `file_url TEXT`, `grader grader_type`, `status submission_status`, `submitted_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`; optional `mock_tests`; one AI/tutor feedback report.

### speaking_submissions
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `test_id UUID FK mock_tests(id)`, `part_number SMALLINT`, `prompt_text TEXT`, `audio_url TEXT`, `transcript TEXT`, `grader grader_type`, `status submission_status`, `submitted_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users`; optional `mock_tests`; one AI/tutor feedback report.

### ai_feedback_reports
- Important columns: `id UUID PK`, `writing_submission_id UUID FK writing_submissions(id)`, `speaking_submission_id UUID FK speaking_submissions(id)`, `band_score NUMERIC(3,1)`, criteria score columns, `error_highlights JSONB`, `suggestions TEXT`, `raw_ai_response JSONB`, `generated_at TIMESTAMPTZ`.
- Relationships: exactly one of `writing_submission_id` or `speaking_submission_id` must be non-null.

### tutor_feedback_reports
- Important columns: `id UUID PK`, `tutor_id UUID FK users(id)`, `writing_submission_id UUID FK writing_submissions(id)`, `speaking_submission_id UUID FK speaking_submissions(id)`, `band_score NUMERIC(3,1)`, criteria score columns, `written_feedback TEXT`, `audio_feedback_url TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: belongs to tutor `users`; exactly one submission reference.

### tutor_student_notes
- Important columns: `id UUID PK`, `tutor_id UUID FK users(id)`, `student_id UUID FK users(id)`, `note TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: tutor/student both reference `users`.

### library_resources
- Important columns: `id UUID PK`, `title VARCHAR(500)`, `description TEXT`, `resource_type resource_type`, `file_url TEXT`, `file_size_bytes BIGINT`, `uploaded_by UUID FK users(id)`, `is_published BOOLEAN`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- Relationships: uploaded by `users`.

### chatbot_sessions
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `started_at TIMESTAMPTZ`, `ended_at TIMESTAMPTZ`.
- Relationships: belongs to `users`; has many `chatbot_messages`.

### chatbot_messages
- Important columns: `id UUID PK`, `session_id UUID FK chatbot_sessions(id)`, `role VARCHAR(20) CHECK ('user','assistant')`, `content TEXT`, `tokens_used INT`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `chatbot_sessions`.

### ai_explain_requests
- Important columns: `id UUID PK`, `user_id UUID FK users(id)`, `question_id UUID FK questions(id)`, `tutor_explanation TEXT`, `ai_response TEXT`, `tokens_used INT`, `created_at TIMESTAMPTZ`.
- Relationships: belongs to `users` and `questions`.

### audit_logs
- Important columns: `id UUID PK`, `actor_id UUID FK users(id)`, `action log_action`, `target_table VARCHAR(100)`, `target_id UUID`, `old_value JSONB`, `new_value JSONB`, `ip_address INET`, `created_at TIMESTAMPTZ`.
- Relationships: optional actor references `users`; target fields are polymorphic.

### platform_metrics_snapshots
- Important columns: `id UUID PK`, `snapshot_date DATE UNIQUE`, `total_users INT`, `active_tests INT`, `ai_calls_total INT`, `ai_tokens_total BIGINT`, `new_registrations INT`, `created_at TIMESTAMPTZ`.
- Relationships: aggregate snapshot table, no FK relationships.

## Views

### v_student_dashboard
- Use when: rendering student dashboard summary.
- Data shape: student identity, `target_band_score`, password-change flag, total submitted attempts, average band score, last attempt timestamp.
- Source tables: `users`, `test_attempts`.

### v_tutor_grading_queue
- Use when: tutor needs pending writing/speaking grading queue.
- Data shape: submission type/id, student id/name, submitted time, status, grader.
- Source tables: `writing_submissions`, `speaking_submissions`, `users`.

### v_active_sessions
- Use when: showing or validating active login sessions/device management.
- Data shape: session id, user id/email/name, IP, user agent, OAuth info, activity and expiry timestamps.
- Source tables: `user_sessions`, `users`.

### v_admin_usage_report
- Use when: admin dashboard needs daily usage rollup.
- Data shape: day, new users, test attempts, AI chat message count.
- Source tables: `users`, `test_attempts`, `chatbot_messages`.

## DB Functions

### handle_failed_login(p_user_id UUID)
- Use when: a login attempt fails for a known user.
- Effect: increments `users.failed_login_attempts`; locks account for 15 minutes after 5 failed attempts.

### handle_successful_login(p_user_id UUID)
- Use when: a login attempt succeeds.
- Effect: resets failed-login counter, clears `locked_until`, updates `last_login_at`.

## JSONB Field Schemas

### questions.options
- Expected type: JSON array.
- Suggested item shape: `{ "label": "A", "text": "option text" }`.
- Use when: objective questions have multiple choices or structured selectable answers.

### ai_feedback_reports.error_highlights
- Expected type: JSON array.
- Suggested item shape: `{ "criterion": "grammar|lexical|coherence|task|fluency|pronunciation", "quote": "student text or transcript excerpt", "issue": "description", "suggestion": "fix" }`.
- Use when: AI grading highlights concrete errors in Writing/Speaking submissions.

### ai_feedback_reports.raw_ai_response
- Expected type: JSON object.
- Suggested shape: `{ "provider": "string", "model": "string", "overall_band": 0.0, "criteria_scores": [], "feedback": [], "usage": {} }`.
- Use when: storing sanitized provider response for audit/debugging.

### audit_logs.old_value / audit_logs.new_value
- Expected type: JSON object or null.
- Suggested shape: `{ "field_name": "previous or new value" }`.
- Use when: logging before/after values for audited changes.

## Explicit Non-Schema Tables Mentioned Elsewhere

- `question_blocks`: not present in `.sdd/shared_context.md` schema snapshot.
- `test_passages`: not present in `.sdd/shared_context.md` schema snapshot.
