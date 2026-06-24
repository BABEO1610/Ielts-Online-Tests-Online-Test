export const parseBulkText = (text, blockType) => {
  if (!text || !text.trim()) {
    return { questions: [], error: 'Nội dung không được để trống.' };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const questions = [];
  let currentQuestion = null;
  let currentOptions = [];
  let currentExplanation = [];

  const isMultipleChoice = blockType === 'Multiple Choice';
  const isTrueFalse = ['True/False/Not Given', 'Yes/No/Not Given'].includes(blockType);

  // Regex helpers
  const questionRegex = /^(\d+)\.\s*(.*)/; // e.g., "1. What is..."
  const optionRegex = /^(\*?)([A-Za-z])\.\s*(.*)/; // e.g., "A. Option", "*B. Correct"
  const shortAnswerRegex = /^(\*?)(.*)/; // For Completion, everything that is not a question or explanation could be an answer
  const explanationRegex = /^(?:Giải thích|Explanation):\s*(.*)/i;

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. Check if line is a new question
      const qMatch = line.match(questionRegex);
      if (qMatch) {
        // Save previous question if exists
        if (currentQuestion) {
          currentQuestion.explanation = currentExplanation.join('\n').trim();
          if (isMultipleChoice) currentQuestion.options = [...currentOptions];
          questions.push(currentQuestion);
        }

        currentQuestion = {
          id: Date.now() + i,
          text: qMatch[2].trim(),
          explanation: '',
        };

        if (isMultipleChoice) {
          currentQuestion.correctAnswers = [];
          currentOptions = [];
        } else {
          currentQuestion.correctAnswer = '';
        }
        
        currentExplanation = [];
        continue;
      }

      if (!currentQuestion) continue;

      // 2. Check if line is explanation
      const expMatch = line.match(explanationRegex);
      if (expMatch) {
        currentExplanation.push(expMatch[1]);
        continue;
      }

      // If we are currently collecting explanation lines
      if (currentExplanation.length > 0) {
        currentExplanation.push(line);
        continue;
      }

      // 3. Process options / answers based on type
      if (isMultipleChoice) {
        const optMatch = line.match(optionRegex);
        if (optMatch) {
          const isCorrect = optMatch[1] === '*';
          const optId = Date.now() + i * 100;
          currentOptions.push({
            id: optId,
            text: optMatch[3].trim()
          });
          if (isCorrect) {
            currentQuestion.correctAnswers.push(optId);
          }
        }
      } else if (isTrueFalse) {
        // Look for true/false answers with * or just exact string match
        const ansMatch = line.match(shortAnswerRegex);
        if (ansMatch) {
          const val = ansMatch[2].toUpperCase().trim();
          if (['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO'].includes(val)) {
            currentQuestion.correctAnswer = val;
          }
        }
      } else {
        // Completion / Short Answer
        const ansMatch = line.match(shortAnswerRegex);
        if (ansMatch) {
          const isCorrect = ansMatch[1] === '*';
          if (isCorrect) {
            currentQuestion.correctAnswer = ansMatch[2].trim();
          } else if (!currentQuestion.correctAnswer) {
             // If no * is found, but we need an answer, we can assume the next line after Q is the answer 
             // but user requested to use * for short answers too. So we enforce * for safety.
             if (line.startsWith('*')) {
               currentQuestion.correctAnswer = line.substring(1).trim();
             }
          }
        }
      }
    }

    // Push the last question
    if (currentQuestion) {
      currentQuestion.explanation = currentExplanation.join('\n').trim();
      if (isMultipleChoice) currentQuestion.options = [...currentOptions];
      questions.push(currentQuestion);
    }

    return { questions, error: null };
  } catch (error) {
    return { questions: [], error: 'Đã xảy ra lỗi trong quá trình phân tích văn bản.' };
  }
};

export const validateParsedQuestions = (questions, blockType) => {
  if (!questions || questions.length === 0) {
    return 'Không tìm thấy câu hỏi nào. Vui lòng kiểm tra lại định dạng (bắt đầu bằng 1. 2. 3.).';
  }

  const isMultipleChoice = blockType === 'Multiple Choice';

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text) {
      return `Câu ${i + 1} đang bị thiếu nội dung câu hỏi.`;
    }

    if (isMultipleChoice) {
      if (!q.options || q.options.length < 2) {
        return `Câu ${i + 1} (${q.text}) phải có ít nhất 2 lựa chọn (A, B...).`;
      }
      if (!q.correctAnswers || q.correctAnswers.length === 0) {
        return `Câu ${i + 1} (${q.text}) chưa được chọn đáp án đúng (thiếu dấu *).`;
      }
      if (q.correctAnswers.length > 1) {
        return `Câu ${i + 1} (${q.text}) có nhiều hơn 1 đáp án đúng. Hiện tại chỉ hỗ trợ 1 đáp án đúng cho mỗi câu.`;
      }
    } else {
      if (!q.correctAnswer) {
        return `Câu ${i + 1} (${q.text}) chưa có đáp án đúng (thiếu dấu * đầu dòng, hoặc ghi sai chính tả TRUE/FALSE).`;
      }
    }
  }
  return null;
};

// --- ADVANCED MODE LOGIC ---

export const MARKER_ALIASES = {
  'Multiple Choice': ['MULTIPLE CHOICE', 'MCQ'],
  'True/False/Not Given': ['TRUE/FALSE/NOT GIVEN', 'TRUE FALSE NOT GIVEN', 'T/F/NG', 'TFNG'],
  'Yes/No/Not Given': ['YES/NO/NOT GIVEN', 'YES NO NOT GIVEN', 'Y/N/NG', 'YNNG'],
  'Sentence Completion': ['SENTENCE COMPLETION', 'COMPLETION', 'FILL IN THE BLANK', 'FILL IN THE BLANKS'],
  'Short-answer Questions': ['SHORT ANSWER', 'SHORT ANSWER QUESTIONS', 'SAQ'],
  'Note/Table/Flow-chart Completion': ['NOTE COMPLETION', 'TABLE COMPLETION', 'FLOW-CHART COMPLETION'],
  'Summary Completion': ['SUMMARY COMPLETION']
};

export const normalizeMarker = (markerText) => {
  const normalized = markerText.toUpperCase().trim();
  for (const [exactType, aliases] of Object.entries(MARKER_ALIASES)) {
    if (exactType.toUpperCase() === normalized || aliases.includes(normalized)) {
      return exactType;
    }
  }
  return null;
};

export const parseAdvancedText = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length === 0) return { blocks: [], errors: ['Văn bản trống.'] };

  const blocksData = [];
  let currentBlockType = null;
  let currentBlockLines = [];
  const errors = [];
  
  const markerRegex = /^\[(.*?)\]$/;

  // Validate the very first line is a marker
  if (!lines[0].match(markerRegex)) {
    return { blocks: [], errors: ['Không tìm thấy marker hợp lệ ở dòng đầu tiên. Vui lòng thêm marker như [MCQ] hoặc [T/F/NG].'] };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(markerRegex);
    
    if (match) {
      // Process the previous block if exists
      if (currentBlockType && currentBlockLines.length > 0) {
        blocksData.push({ type: currentBlockType, lines: currentBlockLines });
      }
      
      const rawMarker = match[1];
      const normalizedType = normalizeMarker(rawMarker);
      if (!normalizedType) {
        errors.push(`Marker không được hỗ trợ: [${rawMarker}] ở dòng ${i + 1}`);
        currentBlockType = null;
      } else {
        currentBlockType = normalizedType;
      }
      currentBlockLines = [];
    } else {
      if (currentBlockType) {
        currentBlockLines.push(line);
      }
    }
  }
  
  // Push the last block
  if (currentBlockType && currentBlockLines.length > 0) {
    blocksData.push({ type: currentBlockType, lines: currentBlockLines });
  }

  if (errors.length > 0) {
    return { blocks: [], errors };
  }

  const finalBlocks = [];
  // Parse each block using the existing parseBulkText
  for (let i = 0; i < blocksData.length; i++) {
    const b = blocksData[i];
    const { questions, error: parseError } = parseBulkText(b.lines.join('\n'), b.type);
    
    if (parseError) {
      errors.push(`Lỗi trong khối [${b.type}]: ${parseError}`);
      continue;
    }
    
    const valError = validateParsedQuestions(questions, b.type);
    if (valError) {
      errors.push(`Lỗi khối [${b.type}]: ${valError}`);
      continue;
    }
    
    finalBlocks.push({
      id: Date.now() + i,
      type: b.type,
      range: `1-${questions.length}`,
      questions: questions,
      options: []
    });
  }

  return { blocks: finalBlocks, errors: errors.length > 0 ? errors : null };
};

