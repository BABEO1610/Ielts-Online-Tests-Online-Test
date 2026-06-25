const { pool } = require('../db/pool');

/**
 * Service to handle tests.
 */
class TestService {
  static serializeJsonb(value) {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
  }

  static getQuestionText(question, block) {
    return question.text || question.questionText || block.content || null;
  }

  static normalizeSkill(data) {
    const supportedSkills = ['reading', 'listening', 'writing', 'speaking'];
    return supportedSkills.includes(data.skill) ? data.skill : 'reading';
  }

  static normalizePassages(data) {
    if (data.skill === 'listening') {
      return (data.sections || []).map((section) => ({
        title: section.title,
        instruction: TestService.serializeJsonb({
          show_transcript: section.showTranscript !== false,
          start_time: section.startTime || null,
          end_time: section.endTime || null
        }),
        content: section.transcript || null,
        defaultRange: section.defaultRange,
        blocks: section.blocks || []
      }));
    }

    if (data.skill === 'writing') {
      const task1Meta = {
        type: 'task1',
        testType: data.testType,
        chartType: data.task1?.chartType || null,
        letterType: data.task1?.letterType || null,
        imageUrl: data.task1?.imageUrl || null,
        imageName: data.task1?.imageName || null,
        sampleAnswer: data.task1?.sampleAnswer || null
      };
      const task2Meta = {
        type: 'task2',
        essayType: data.task2?.essayType || null,
        topicTags: data.task2?.topicTags || null,
        sampleAnswer: data.task2?.sampleAnswer || null
      };

      return [
        {
          title: 'Writing Task 1',
          instruction: TestService.serializeJsonb(task1Meta),
          content: data.task1?.prompt || '',
          blocks: []
        },
        {
          title: 'Writing Task 2',
          instruction: TestService.serializeJsonb(task2Meta),
          content: data.task2?.prompt || '',
          blocks: []
        }
      ];
    }

    return data.passages || [];
  }

  /**
   * Create a reading test with passages, question blocks, and questions using a transaction.
   */
  static async createReadingTest(data, userId) {
    const { title, description, difficulty, duration, publishAt, audioUrl } = data;
    const skill = TestService.normalizeSkill(data);
    const passages = TestService.normalizePassages(data);
    
    // Tutors cannot publish directly. Admin must approve.
    const isPublished = false; 
    const isDraft = !publishAt;
    const reviewStatus = isDraft ? 'pending' : 'pending'; // Drafts also stay pending for now (or we could use 'draft' if DB allowed, but enum only has pending, approved, rejected)
    const submittedAt = isDraft ? null : new Date().toISOString();

    let missingAnswer = false;
    for (const passage of passages) {
      if (passage.blocks && Array.isArray(passage.blocks)) {
        for (const block of passage.blocks) {
          if (block.questions && Array.isArray(block.questions)) {
            for (const q of block.questions) {
              let requiresManualAnswer = false;
              try {
                const opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || block.options || {});
                requiresManualAnswer = opts.requiresManualAnswer === true;
              } catch(e) {}
              
              // For MCQ single vs multi
              const hasCorrectStr = typeof q.correctAnswer === 'string' && q.correctAnswer.trim() !== '';
              const hasCorrectArr = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0;
              
              if (requiresManualAnswer || (!hasCorrectStr && !hasCorrectArr)) {
                missingAnswer = true;
                break;
              }
            }
          }
          if (missingAnswer) break;
        }
      }
      if (missingAnswer) break;
    }
    if (missingAnswer) {
      const error = new Error('Không thể publish đề thi: Vẫn còn câu hỏi chưa có đáp án đúng.');
      error.statusCode = 400; // Will be handled by errorHandler
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Test (with audio_url for listening tests)
      const testRes = await client.query(
        `INSERT INTO mock_tests (title, description, skill, difficulty, duration_minutes, is_published, publish_at, created_by, audio_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [title, description, skill, difficulty, duration, isPublished, publishAt || null, userId, audioUrl || null]
      );
      const testId = testRes.rows[0].id;

      let questionOrder = 1;

      // 2. Insert Passages
      for (const [pIdx, passage] of passages.entries()) {
        const pRes = await client.query(
          `INSERT INTO test_passages (test_id, passage_number, title, instruction, content)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [testId, pIdx + 1, passage.title, passage.instruction, passage.content]
        );
        const passageId = pRes.rows[0].id;

        // 3. Insert Question Blocks
        if (passage.blocks && Array.isArray(passage.blocks)) {
          for (const [bIdx, block] of passage.blocks.entries()) {
            const bRes = await client.query(
              `INSERT INTO question_blocks (passage_id, block_order, question_type, question_range, content)
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [passageId, bIdx + 1, block.type, block.range, block.content || null]
            );
            const blockId = bRes.rows[0].id;

            // 4. Insert Questions
            if (block.questions && Array.isArray(block.questions)) {
              for (const q of block.questions) {
                // For matching questions, always store the full options pool with text
                let options;
                if (block.type && block.type.toLowerCase().includes('matching') && block.options) {
                  // For matching, store the full pool of options with text
                  options = TestService.serializeJsonb(block.options);
                } else {
                  // For other types, use question-specific options if available
                  options = TestService.serializeJsonb(q.options || block.options);
                }
                const correctAnswers = TestService.serializeJsonb(q.correctAnswers);
                await client.query(
                  `INSERT INTO questions (test_id, block_id, question_order, question_text, options, correct_answer, correct_answers, explanation)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    testId,
                    blockId,
                    questionOrder++,
                    TestService.getQuestionText(q, block),
                    options,
                    q.correctAnswer,
                    correctAnswers,
                    q.explanation || null
                  ]
                );
              }
            }
          }
        }
      }

      await client.query('COMMIT');
      return { id: testId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all mock tests with their question counts.
   * @param {string|null} skill - Optional filter: 'reading' | 'listening' | etc.
   */
  static async getTests(options = {}) {
    const { skill, isPublished, tutor, all } = options;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (skill) {
      params.push(skill);
      whereClause += ` AND mt.skill = $${params.length}`;
    }

    if (isPublished !== undefined) {
      params.push(isPublished === 'true' || isPublished === true);
      whereClause += ` AND mt.is_published = $${params.length}`;
    }

    const query = `
      SELECT 
        mt.id, 
        mt.title, 
        mt.description,
        mt.skill, 
        mt.difficulty,
        mt.duration_minutes,
        mt.is_published,
        mt.review_status,
        mt.submitted_at,
        mt.created_at,
        COUNT(q.id) as questions
      FROM mock_tests mt
      LEFT JOIN questions q ON mt.id = q.test_id
      ${whereClause}
      GROUP BY mt.id
      ORDER BY mt.created_at DESC;
    `;

    const result = await pool.query(query, params);

    return result.rows.map(row => {
      let statusStr = row.is_published ? 'published' : 'draft';
      // Give more detail based on review_status and submitted_at
      if (!row.is_published) {
        if (row.review_status === 'pending') {
          statusStr = row.submitted_at ? 'pending' : 'draft';
        } else if (row.review_status === 'rejected') {
          statusStr = 'rejected';
        }
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        skill: row.skill,
        difficulty: row.difficulty,
        duration_minutes: row.duration_minutes,
        duration: row.duration_minutes,
        reviewStatus: row.review_status,
        status: statusStr,
        questions: parseInt(row.questions, 10),
        createdAt: new Date(row.created_at).toISOString().split('T')[0]
      };
    });
  }


  /**
   * Fetch all published writing tests with their tasks (passages).
   */
  static async getWritingTests() {
    const testRes = await pool.query(`
      SELECT 
        id, 
        title, 
        description,
        difficulty,
        duration_minutes,
        created_at
      FROM mock_tests
      WHERE skill = 'writing' AND is_published = true
      ORDER BY created_at DESC
    `);

    const tests = testRes.rows;
    if (tests.length === 0) return [];

    const testIds = tests.map(t => t.id);
    const passagesRes = await pool.query(
      `SELECT * FROM test_passages WHERE test_id = ANY($1) ORDER BY test_id, passage_number ASC`,
      [testIds]
    );

    const passages = passagesRes.rows;

    return tests.map(test => {
      const testPassages = passages.filter(p => p.test_id === test.id);
      
      const tasks = testPassages.map(p => {
        let instructionData = {};
        try {
          if (p.instruction) {
            instructionData = JSON.parse(p.instruction);
          }
        } catch (e) {
          // ignore parsing error
        }
        
        return {
          id: p.id,
          task_number: p.passage_number,
          title: p.title,
          prompt_text: p.content,
          duration: instructionData.type === 'task1' ? '20 phút' : '40 phút',
          min_words: instructionData.type === 'task1' ? 150 : 250,
          illustration: instructionData.imageUrl || null,
          hint: instructionData.hint || null
        };
      });

      // format date e.g. "Tháng 6, 2026"
      const dateObj = new Date(test.created_at);
      const dateStr = `Tháng ${dateObj.getMonth() + 1}, ${dateObj.getFullYear()}`;
      
      let difficultyVi = 'Trung bình';
      if (test.difficulty === 'beginner') difficultyVi = 'Dễ';
      if (test.difficulty === 'advanced') difficultyVi = 'Khó';

      return {
        id: test.id,
        title: test.title,
        date: dateStr,
        difficulty: difficultyVi,
        duration_minutes: test.duration_minutes,
        tasks
      };
    });
  }

  /**
   * Fetch full test details by ID
   */
  static async getTestById(id) {
    const normalizedId = String(id).replace(/\s+/g, '-');
    const testRes = await pool.query(`SELECT * FROM mock_tests WHERE id::text = $1 OR id::text = $2`, [id, normalizedId]);
    if (testRes.rows.length === 0) return null;
    const test = testRes.rows[0];
    
    // Parse audio_url for listening tests
    const audioUrl = test.audio_url || null;

    const passagesRes = await pool.query(
      `SELECT * FROM test_passages WHERE test_id::text = $1 OR test_id::text = $2 ORDER BY passage_number ASC`,
      [id, normalizedId]
    );

    const passageIds = passagesRes.rows.map(p => p.id);
    let blocks = [];
    let questions = [];

    if (passageIds.length > 0) {
      const blocksRes = await pool.query(
        `SELECT * FROM question_blocks WHERE passage_id::text = ANY($1::text[]) ORDER BY block_order ASC`,
        [passageIds]
      );
      blocks = blocksRes.rows;

      const questionsRes = await pool.query(
        `SELECT * FROM questions WHERE test_id::text = $1 OR test_id::text = $2 ORDER BY question_order ASC`,
        [id, normalizedId]
      );
      questions = questionsRes.rows;
    }

    // Assemble the nested structure
    const passages = passagesRes.rows.map(p => {
      const pBlocks = blocks.filter(b => b.passage_id === p.id).map(b => {
        const bQuestions = questions.filter(q => q.block_id === b.id).map(q => ({
          id: q.id,
          questionOrder: q.question_order,
          text: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          correctAnswers: q.correct_answers,
          explanation: q.explanation
        }));

        return {
          id: b.id,
          type: b.question_type,
          range: b.question_range,
          content: b.content,
          questions: bQuestions
        };
      });

      return {
        id: p.id,
        passageNumber: p.passage_number,
        title: p.title,
        instruction: p.instruction,
        content: p.content,
        blocks: pBlocks
      };
    });

    const sections = test.skill === 'listening'
      ? passages.map((p, idx) => {
          // Parse instruction JSONB for listening metadata
          let metadata = {};
          try {
            metadata = typeof p.instruction === 'string' ? JSON.parse(p.instruction) : (p.instruction || {});
          } catch {
            metadata = {};
          }
          
          return {
            id: p.id,
            sectionNumber: p.passageNumber,
            title: p.title,
            transcript: p.content || '',
            showTranscript: metadata.show_transcript !== false,
            startTime: metadata.start_time || null,
            endTime: metadata.end_time || null,
            defaultRange: `${idx * 10 + 1}-${idx * 10 + 10}`,
            blocks: p.blocks
          };
        })
      : undefined;

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      skill: test.skill,
      difficulty: test.difficulty,
      duration: test.duration_minutes,
      isPublished: test.is_published,
      publishAt: test.publish_at,
      audioUrl: audioUrl,  // Audio URL for listening tests
      passages,
      sections
    };
  }

  /**
   * Fetch test for student (hide answers and explanations)
   */
  static async getTestForStudent(id) {
    const test = await TestService.getTestById(id);
    if (!test) return null;

    // Filter out correct answers and explanations
    const sanitizePassages = (passages) => passages.map(p => ({
      ...p,
      blocks: (p.blocks || []).map(b => ({
        ...b,
        questions: (b.questions || []).map(q => ({
          id: q.id,
          questionOrder: q.questionOrder,
          text: q.text,
          options: q.options
        }))
      }))
    }));

    if (test.passages) test.passages = sanitizePassages(test.passages);
    if (test.sections) test.sections = sanitizePassages(test.sections);

    return test;
  }

  /**
   * Update an existing reading test
   */
  static async updateReadingTest(testId, data, userId) {
    const { title, description, difficulty, duration, publishAt, audioUrl } = data;
    const skill = TestService.normalizeSkill(data);
    const passages = TestService.normalizePassages(data);
    
    // Tutors cannot publish directly. Admin must approve.
    // However, if an admin is updating, we might want to keep it published?
    // For now, any update resets it to pending review unless it's just a draft.
    const isPublished = false; 
    const isDraft = !publishAt;
    const reviewStatus = 'pending';
    const submittedAt = isDraft ? null : new Date().toISOString();

    let missingAnswer = false;
    for (const passage of passages) {
      if (passage.blocks && Array.isArray(passage.blocks)) {
        for (const block of passage.blocks) {
          if (block.questions && Array.isArray(block.questions)) {
            for (const q of block.questions) {
              let requiresManualAnswer = false;
              try {
                const opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || block.options || {});
                requiresManualAnswer = opts.requiresManualAnswer === true;
              } catch(e) {}
              
              const hasCorrectStr = typeof q.correctAnswer === 'string' && q.correctAnswer.trim() !== '';
              const hasCorrectArr = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0;
              
              if (requiresManualAnswer || (!hasCorrectStr && !hasCorrectArr)) {
                missingAnswer = true;
                break;
              }
            }
          }
          if (missingAnswer) break;
        }
      }
      if (missingAnswer) break;
    }
    if (missingAnswer) {
      const error = new Error('Không thể publish đề thi: Vẫn còn câu hỏi chưa có đáp án đúng.');
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update Test (including audio_url for listening tests)
      await client.query(
        `UPDATE mock_tests 
         SET title = $1, description = $2, skill = $3, difficulty = $4, duration_minutes = $5, is_published = $6, publish_at = $7, audio_url = $8 
         WHERE id = $9`,
        [title, description, skill, difficulty, duration, isPublished, publishAt || null, audioUrl || null, testId]
      );

      // 2. Delete existing nested records before rebuilding the test.
      // Some older rows may not have block_id populated, so delete by test_id explicitly.
      await client.query(`DELETE FROM questions WHERE test_id = $1`, [testId]);
      await client.query(`DELETE FROM test_passages WHERE test_id = $1`, [testId]);


      let questionOrder = 1;

      // 3. Re-insert Passages, Blocks, Questions
      for (const [pIdx, passage] of passages.entries()) {
        const pRes = await client.query(
          `INSERT INTO test_passages (test_id, passage_number, title, instruction, content)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [testId, pIdx + 1, passage.title, passage.instruction, passage.content]
        );
        const passageId = pRes.rows[0].id;

        if (passage.blocks && Array.isArray(passage.blocks)) {
          for (const [bIdx, block] of passage.blocks.entries()) {
            const bRes = await client.query(
              `INSERT INTO question_blocks (passage_id, block_order, question_type, question_range, content)
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [passageId, bIdx + 1, block.type, block.range, block.content || null]
            );
            const blockId = bRes.rows[0].id;

            if (block.questions && Array.isArray(block.questions)) {
              for (const q of block.questions) {
                // For matching questions, always store the full options pool with text
                let options;
                if (block.type && block.type.toLowerCase().includes('matching') && block.options) {
                  // For matching, store the full pool of options with text
                  options = TestService.serializeJsonb(block.options);
                } else {
                  // For other types, use question-specific options if available
                  options = TestService.serializeJsonb(q.options || block.options);
                }
                const correctAnswers = TestService.serializeJsonb(q.correctAnswers);
                await client.query(
                  `INSERT INTO questions (test_id, block_id, question_order, question_text, options, correct_answer, correct_answers, explanation)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    testId,
                    blockId,
                    questionOrder++,
                    TestService.getQuestionText(q, block),
                    options,
                    q.correctAnswer,
                    correctAnswers,
                    q.explanation || null
                  ]
                );
              }
            }
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a test by ID
   */
  static async deleteTest(testId) {
    // ON DELETE CASCADE will handle child records in test_passages, question_blocks, questions
    await pool.query(`DELETE FROM mock_tests WHERE id = $1`, [testId]);
  }
}

module.exports = TestService;
