require('dotenv').config({ path: __dirname + '/../../.env' });
const assistantService = require('../src/api/assistant/assistant.service');

async function testChat() {
  const user = { id: '9674b5ab-cba7-4715-928a-e574b7be33df' };

  const tests = [
    { msg: 'Chào bạn', route: '/', page: 'home' },
    { msg: 'Paraphrase câu này giúp em', route: '/', page: 'home' },
    { msg: 'Paraphrase câu này: people are living longer', route: '/', page: 'home' },
    { msg: 'Làm sao cải thiện Reading True/False/Not Given?', route: '/', page: 'home' },
    { msg: 'Chấm bài này band mấy', route: '/', page: 'home' },
    { msg: 'Viết code React cho tôi', route: '/', page: 'home' },
    { msg: 'Bạn có đề reading nào trong hệ thống không', route: '/', page: 'home' },
    { msg: 'trên web mình có bài luyện listening nào không', route: '/', page: 'home' },
    { msg: 'thư viện có gì để nghe không', route: '/library', page: 'library' },
    { msg: 'có tài liệu luyện nghe nào không', route: '/library', page: 'library' },
    { msg: 'mình muốn luyện reading thì có gì', route: '/', page: 'home' }
  ];

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    console.log(`\n--- Test ${i + 1}: ${t.msg} ---`);
    await assistantService.runAssistantPipeline({
      user,
      payload: {
        message: t.msg,
        context: { route: t.route, pageType: t.page }
      }
    });
  }

  const { pool } = require('../src/db/pool');
  await pool.end();
  process.exit(0);
}

testChat();
