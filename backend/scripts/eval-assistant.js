const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { pool } = require('../src/db/pool');
const { createSession } = require('../src/db/queries/sessions.queries');
const { generateAccessToken, generateOpaqueToken } = require('../src/utils/token.util');

const EVAL_FILE = path.join(__dirname, '../../.sdd/specs/global-ielts-virtual-assistant/eval-set.md');

async function testAssistant() {
  try {
    const { rows: studentRows } = await pool.query("SELECT * FROM users WHERE role = 'student' AND status = 'active' LIMIT 1");
    if (!studentRows.length) throw new Error("No active student found");
    const student = studentRows[0];

    const sessionToken = generateOpaqueToken().raw;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await createSession(student.id, sessionToken, '127.0.0.1', 'EvalScript', expiresAt);

    const validJwt = generateAccessToken({
      sub: student.id,
      role: student.role,
      session_token: sessionToken
    });

    const lines = fs.readFileSync(EVAL_FILE, 'utf8').split('\n');
    const updatedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.includes('| PENDING_MANUAL_RUN |')) {
        const parts = line.split('|').map(p => p.trim());
        // Detect question
        let question = '';
        let isGuest = false;
        let isExpired = false;
        let isNonStudent = false;
        
        // Find the question text
        if (parts[1].startsWith('TA-') || parts[1].startsWith('TB-') || parts[1].startsWith('R-')) {
          question = parts[2];
        } else {
          question = parts[1];
        }

        // Special handling for Guest/Auth group
        let tokenToUse = validJwt;
        if (question.includes('Guest')) {
          isGuest = true;
          tokenToUse = null;
          question = question.replace(/Guest bấm mở chatbot và hỏi "|Guest hỏi "|Request `POST .*` không có token, message "/, '').replace(/"$/, '');
        } else if (question.includes('Token hết hạn')) {
          isExpired = true;
          tokenToUse = 'invalid.jwt.token';
          question = question.replace(/Token hết hạn gửi "/, '').replace(/"$/, '');
        } else if (question.includes('User role không phải student')) {
          isNonStudent = true;
          // We won't bother creating a tutor session, just mock the token
          tokenToUse = generateAccessToken({ sub: student.id, role: 'tutor', session_token: sessionToken });
          question = question.replace(/User role không phải student hỏi "/, '').replace(/"$/, '');
        } else if (question.includes('Student chưa nộp bài hỏi')) {
          question = question.replace(/Student chưa nộp bài hỏi "/, '').replace(/"$/, '');
        }

        let actualResult = '';
        console.log(`Testing: ${question}`);
        
        const headers = { 'Content-Type': 'application/json' };
        if (tokenToUse) headers['Cookie'] = `accessToken=${tokenToUse}`;

        try {
          const res = await fetch('http://localhost:3000/api/v1/assistant/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: question,
              context: { pageType: 'home' }
            })
          });
          
          if (res.status === 401) {
            actualResult = 'LOGIN_REQUIRED (401)';
          } else if (res.status === 403) {
            actualResult = 'FORBIDDEN (403)';
          } else if (res.status === 429) {
            actualResult = 'RATE_LIMIT_EXCEEDED (429)';
            // Wait longer if hit rate limit
            await new Promise(r => setTimeout(r, 3000));
          } else {
            let data;
            try {
              data = await res.json();
            } catch (e) {
              data = { answer: await res.text() };
            }
            if (data.code) {
              actualResult = `${data.code} (${res.status})`;
            } else {
              const ans = data.answer || '';
              const usedDb = data.usedDatabase ? ' [DB]' : '';
              const answerPreview = ans.length > 30 ? ans.substring(0, 30).replace(/\n/g, ' ') + '...' : ans.replace(/\n/g, ' ');
              actualResult = `Success: ${answerPreview}${usedDb}`;
            }
          }
          await new Promise(r => setTimeout(r, 2100)); // Rate limit is 30/min -> 1 req per 2s
        } catch (err) {
          actualResult = `Error: ${err.message}`;
        }
        
        line = line.replace('PENDING_MANUAL_RUN', actualResult);
      }
      updatedLines.push(line);
    }

    fs.writeFileSync(EVAL_FILE, updatedLines.join('\n'));
    console.log('Eval completed. Check eval-set.md for results.');
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

testAssistant();
