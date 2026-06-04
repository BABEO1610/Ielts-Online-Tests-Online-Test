-- EARS[Unwanted]: WHERE a User inputs an incorrect password, THE system SHALL call the DB function handle_failed_login().
-- EARS[Unwanted]: WHERE a User has failed_login_attempts >= 5, THE system SHALL lock the login flow for 15 minutes (based on locked_until) and return HTTP 429 Too Many Requests.

CREATE OR REPLACE FUNCTION handle_failed_login(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_attempts INT;
BEGIN
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = p_user_id
    RETURNING failed_login_attempts INTO v_attempts;

    -- If attempts >= 5, lock the account
    IF v_attempts >= 5 THEN
        UPDATE users 
        SET status = 'inactive',
            locked_until = NOW() + INTERVAL '15 minutes'
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
