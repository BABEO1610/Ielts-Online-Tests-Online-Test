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
        instruction: section.audioUrl || null,
        content: section.transcript || null,
        showTranscript: section.showTranscript !== false,
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
    const { title, description, difficulty, duration, publishAt } = data;
    const skill = TestService.normalizeSkill(data);
    const passages = TestService.normalizePassages(data);
    
    // Tutors cannot publish directly. Admin must approve.
    const isPublished = false; 
    const isDraft = !publishAt;
    const reviewStatus = isDraft ? 'pending' : 'pending'; // Drafts also stay pending for now (or we could use 'draft' if DB allowed, but enum only has pending, approved, rejected)
    const submittedAt = isDraft ? null : new Date().toISOString();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert Test
      const testRes = await client.query(
        `INSERT INTO mock_tests (title, description, skill, difficulty, duration_minutes, is_published, publish_at, created_by, review_status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [title, description, skill, difficulty, duration, isPublished, publishAt || null, userId, reviewStatus, submittedAt]
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
              `INSERT INTO question_blocks (passage_id, block_order, question_type, question_range)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [passageId, bIdx + 1, block.type, block.range]
            );
            const blockId = bRes.rows[0].id;

            // 4. Insert Questions
            if (block.questions && Array.isArray(block.questions)) {
              for (const q of block.questions) {
                const options = TestService.serializeJsonb(q.options || block.options);
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
  static async getTests(skill = null, showAll = false, tutorId = null) {
    const query = `
      SELECT 
        mt.id, 
        mt.title, 
        mt.skill, 
        mt.difficulty,
        mt.is_published,
        mt.review_status,
        mt.submitted_at,
        mt.duration_minutes,
        mt.description,
        mt.created_at,
        COUNT(q.id) as questions
      FROM mock_tests mt
      LEFT JOIN questions q ON mt.id = q.test_id
      WHERE ($1::text IS NULL OR mt.skill::text = $1::text)
        AND ($2::boolean = true OR mt.is_published = true)
        AND ($3::uuid IS NULL OR mt.created_by = $3::uuid)
      GROUP BY mt.id
      ORDER BY mt.created_at DESC;
    `;

    const result = await pool.query(query, [skill || null, showAll, tutorId || null]);

    return result.rows.map(row => {
      let statusStr = row.is_published ? 'published' : 'draft';
      // If it's not published, give more detail based on review_status and submitted_at
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
        skill: row.skill,
        difficulty: row.difficulty,
        description: row.description,
        duration: row.duration_minutes,
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
    const testRes = await pool.query(`SELECT * FROM mock_tests WHERE id = $1`, [id]);
    if (testRes.rows.length === 0) return null;
    const test = testRes.rows[0];

    const passagesRes = await pool.query(
      `SELECT * FROM test_passages WHERE test_id = $1 ORDER BY passage_number ASC`,
      [id]
    );

    const passageIds = passagesRes.rows.map(p => p.id);
    let blocks = [];
    let questions = [];

    if (passageIds.length > 0) {
      const blocksRes = await pool.query(
        `SELECT * FROM question_blocks WHERE passage_id = ANY($1) ORDER BY block_order ASC`,
        [passageIds]
      );
      blocks = blocksRes.rows;

      const questionsRes = await pool.query(
        `SELECT * FROM questions WHERE test_id = $1 ORDER BY question_order ASC`,
        [id]
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
      ? passages.map((p, idx) => ({
        id: p.id,
        sectionNumber: p.passageNumber,
        title: p.title,
        audioUrl: p.instruction || '',
        transcript: p.content || '',
        showTranscript: true,
        defaultRange: `${idx * 10 + 1}-${idx * 10 + 10}`,
        blocks: p.blocks
      }))
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
      passages,
      sections
    };
  }

  /**
   * Update an existing reading test
   */
  static async updateReadingTest(testId, data, userId) {
    const { title, description, difficulty, duration, publishAt } = data;
    const skill = TestService.normalizeSkill(data);
    const passages = TestService.normalizePassages(data);
    
    // Tutors cannot publish directly. Admin must approve.
    // However, if an admin is updating, we might want to keep it published?
    // For now, any update resets it to pending review unless it's just a draft.
    const isPublished = false; 
    const isDraft = !publishAt;
    const reviewStatus = 'pending';
    const submittedAt = isDraft ? null : new Date().toISOString();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update Test
      await client.query(
        `UPDATE mock_tests 
         SET title = $1, description = $2, skill = $3, difficulty = $4, duration_minutes = $5, is_published = $6, publish_at = $7, review_status = $8, submitted_at = $9 
         WHERE id = $10`,
        [title, description, skill, difficulty, duration, isPublished, publishAt || null, reviewStatus, submittedAt, testId]
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
              `INSERT INTO question_blocks (passage_id, block_order, question_type, question_range)
               VALUES ($1, $2, $3, $4) RETURNING id`,
              [passageId, bIdx + 1, block.type, block.range]
            );
            const blockId = bRes.rows[0].id;

            if (block.questions && Array.isArray(block.questions)) {
              for (const q of block.questions) {
                const options = TestService.serializeJsonb(q.options || block.options);
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
