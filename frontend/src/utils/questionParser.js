// Helper to sanitize instruction text
export function cleanInstructionText(instruction, rangeStart) {
  if (!instruction) return "";

  let text = String(instruction)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  // Remove anything starting from the first numbered item in the current block.
  // This handles both:
  // "...\n1. Question text"
  // and "... information? 1. Question text"
  if (rangeStart) {
    const firstNumberPattern = new RegExp(
      `(?:^|\\n)\\s*${rangeStart}\\s*[\\.)]?\\s+(?![-–to])`,
      "m"
    );

    const match = text.match(firstNumberPattern);
    if (match && typeof match.index === "number") {
      text = text.slice(0, match.index).trim();
    }
  }

  return text
    .replace(/\s+(Which paragraph|Complete the following|Do the following|Do the statements|In boxes)/g, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  'Summary Completion': ['SUMMARY COMPLETION'],
  'Matching Headings': ['MATCHING HEADINGS', 'MATCHING_HEADING', 'MATCHING_HEADINGS'],
  'Matching Information': ['MATCHING INFORMATION', 'MATCHING_INFO'],
  'Multiple Choice (Multiple)': ['MCQ_MULTI', 'MULTIPLE CHOICE MULTI']
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

export const parseSmartText = (rawText) => {
  if (!rawText || !rawText.trim()) return { blocks: [], errors: ['Văn bản trống.'] };

  const answerMarkerRegex = /^\s*\[?\s*(ANSWERS?|ANSWER\s*KEY)\s*\]?\s*:?\s*$/im;
  const explanationMarkerRegex = /^\s*\[?\s*(EXPLANATIONS?|EXPLANATION)\s*\]?\s*:?\s*$/im;

  const answerMatch = rawText.match(answerMarkerRegex);
  const explanationMatch = rawText.match(explanationMarkerRegex);

  let questionsText = rawText;
  let answersText = "";
  let explanationsText = "";

  if (answerMatch && typeof answerMatch.index === "number") {
    questionsText = rawText.slice(0, answerMatch.index).trim();

    const answerStart = answerMatch.index + answerMatch[0].length;

    if (explanationMatch && typeof explanationMatch.index === "number" && explanationMatch.index > answerMatch.index) {
      answersText = rawText.slice(answerStart, explanationMatch.index).trim();
      explanationsText = rawText.slice(explanationMatch.index + explanationMatch[0].length).trim();
    } else {
      answersText = rawText.slice(answerStart).trim();
    }
  } else if (explanationMatch && typeof explanationMatch.index === "number") {
    questionsText = rawText.slice(0, explanationMatch.index).trim();
    explanationsText = rawText.slice(explanationMatch.index + explanationMatch[0].length).trim();
  }

  // Parse Answer Map
  const answerMap = {};
  let duplicateAnsError = null;
  const ansLines = answersText.split('\n');
  for (const line of ansLines) {
    const m = line.trim().match(/^(\d+)\s*[\.\)\-:]?\s+(.+)$/i);
    if (m) {
      const qNum = parseInt(m[1], 10);
      let rawAns = m[2];
      
      let norm = rawAns.trim();
      let up = norm.toUpperCase();
      if (up === 'T' || up === 'TRUE') norm = 'TRUE';
      else if (up === 'F' || up === 'FALSE') norm = 'FALSE';
      else if (up === 'NG' || up === 'NOTGIVEN' || up === 'NOT GIVEN') norm = 'NOT GIVEN';
      else if (up === 'Y' || up === 'YES') norm = 'YES';
      else if (up === 'N' || up === 'NO') norm = 'NO';
      else if (norm.length === 1 && up.match(/[A-Z]/)) norm = up;

      if (answerMap[qNum] !== undefined) {
         duplicateAnsError = `Lỗi: Có nhiều đáp án cho cùng câu hỏi số ${qNum} (Duplicate answer key)`;
         break;
      }
      answerMap[qNum] = norm;
    }
  }

  // Parse Explanation Map
  const explanationMap = {};
  const expLines = explanationsText.split('\n');
  let currentExpNum = null;
  let currentExpLines = [];
  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const m = line.trim().match(/^(\d+)\s*[\.\)\-:]?\s+(.*)$/i);
    if (m) {
      if (currentExpNum !== null) {
        explanationMap[currentExpNum] = currentExpLines.join('\n').trim();
      }
      currentExpNum = parseInt(m[1], 10);
      currentExpLines = [m[2]];
    } else if (currentExpNum !== null && line.trim()) {
      currentExpLines.push(line);
    }
  }
  if (currentExpNum !== null) {
    explanationMap[currentExpNum] = currentExpLines.join('\n').trim();
  }

  const blocksData = [];
  const lines = questionsText.split('\n');
  
  let currentBlock = null;
  const questionHeaderRegex = /^Questions?\s+(\d+)(?:\s*-\s*(\d+))?/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(questionHeaderRegex);
    if (match) {
      if (currentBlock) {
        blocksData.push(currentBlock);
      }
      currentBlock = {
        headerLine: line,
        rangeStart: parseInt(match[1], 10),
        rangeEnd: match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10),
        lines: []
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }
  if (currentBlock) {
    blocksData.push(currentBlock);
  }

  if (blocksData.length === 0) {
    return { blocks: [], errors: ['Không tìm thấy pattern "Questions X-Y" trong văn bản. Vui lòng kiểm tra lại định dạng đề.'] };
  }

  const finalBlocks = [];

  for (const block of blocksData) {
    let { rangeStart, rangeEnd, lines } = block;
    
    // Normalize lines to handle "1.\n text" or "1\n text"
    const normalizedLines = [];
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].trim();
      if (!l) continue;
      if (l.match(/^\d+\.?$/) && i + 1 < lines.length) {
         l = l + ' ' + lines[i+1].trim();
         i++; // skip next line
      }
      normalizedLines.push(l);
    }
    lines = normalizedLines;

    let typeDetectInstruction = '';
    let detectedType = '';
    let answerFormat = '';
    
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      typeDetectInstruction += lines[i] + ' ';
    }
    
    const instrUpper = typeDetectInstruction.toUpperCase();
    if (instrUpper.includes('WHICH PARAGRAPH CONTAINS')) {
      detectedType = 'MATCHING_INFORMATION';
      answerFormat = 'A-Z';
    } else if (instrUpper.includes('HEADINGS BEST FIT') || instrUpper.includes('CHOOSE THE CORRECT HEADING')) {
      detectedType = 'MATCHING_HEADINGS';
      answerFormat = 'i-x';
    } else if (instrUpper.includes('COMPLETE THE FOLLOWING SENTENCES') || instrUpper.includes('NO MORE THAN')) {
      detectedType = 'SENTENCE_COMPLETION';
      answerFormat = 'NO_MORE_THAN_THREE_WORDS';
    } else if (instrUpper.includes('TRUE') && instrUpper.includes('FALSE') && instrUpper.includes('NOT GIVEN')) {
      detectedType = 'TRUE_FALSE_NOT_GIVEN';
      answerFormat = 'T/F/NG';
    } else if (instrUpper.includes('YES') && instrUpper.includes('NO') && instrUpper.includes('NOT GIVEN')) {
      detectedType = 'YES_NO_NOT_GIVEN';
      answerFormat = 'Y/N/NG';
    } else if (instrUpper.includes('ONE OF THE CHOICES IS CORRECT') || instrUpper.includes('CHOOSE THE CORRECT LETTER')) {
      detectedType = 'MULTIPLE_CHOICE_SINGLE';
      answerFormat = 'A-D';
    } else if (instrUpper.includes('OF THE FOLLOWING STATEMENTS ARE TRUE') || instrUpper.match(/CHOOSE \w+ LETTERS/)) {
      detectedType = 'MULTIPLE_CHOICE_MULTI';
      answerFormat = 'MULTI_SELECT';
    }

    if (!detectedType) {
      detectedType = 'UNKNOWN_TYPE';
    }

    // STRICT INSTRUCTION EXTRACTION
    let instructionBreakIdx = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      
      let isQuestionLine = false;
      if (detectedType === 'SENTENCE_COMPLETION') {
         for (let q = rangeStart; q <= rangeEnd; q++) {
            if (l.match(new RegExp(`^${q}\\.\\s+`)) || l.match(new RegExp(`^${q}\\s+`)) || l === `${q}` || l.match(new RegExp(`(^|\\s)${q}(\\s|$)`))) {
               isQuestionLine = true;
               if (l === `${q}` && i > 0 && instructionBreakIdx > i - 1) {
                  instructionBreakIdx = i - 1;
               } else if (instructionBreakIdx > i) {
                  instructionBreakIdx = i;
               }
               break;
            }
         }
      } else if (detectedType === 'MULTIPLE_CHOICE_MULTI') {
         if (l.match(/^([A-Za-z])[\.\)]?\s+(.*)/)) {
            isQuestionLine = true;
            if (instructionBreakIdx > i) instructionBreakIdx = i;
         }
      } else {
         const m = l.match(/^(\d+)[\.\)\-\s]\s*(.*)/);
         if (m) {
            const qNum = parseInt(m[1], 10);
            if (qNum >= rangeStart && qNum <= rangeEnd) {
               isQuestionLine = true;
               if (instructionBreakIdx > i) instructionBreakIdx = i;
            }
         }
      }
      
      if (isQuestionLine) break;
    }

    let instruction = cleanInstructionText(
      lines.slice(0, instructionBreakIdx).join('\n').trim(),
      rangeStart
    );

    const groupRange = rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`;
    
    const parsedBlock = {
      questionType: detectedType, // Will be mapped in UI
      type: detectedType, // Keep for backward compatibility with UI badges
      rangeStart,
      rangeEnd,
      groupRange,
      instruction,
      answerFormat,
      questions: [],
      warnings: []
    };

    const qCount = rangeEnd - rangeStart + 1;
    let questions = [];

    const buildOptions = (choices, extra = {}) => ({
      questionType: detectedType,
      groupRange,
      groupInstruction: instruction,
      answerFormat,
      requiresManualAnswer: true,
      choices,
      ...extra
    });

    if (['MATCHING_INFORMATION', 'MATCHING_HEADINGS'].includes(detectedType)) {
       const qRegex = /^(\d+)[\.\)\-\s]\s*(.*)/;
       let choices = [];
       
       // Attempt to parse range like "A - E" or "A to E" from instruction for both types
       // If MATCHING_HEADINGS doesn't have a range, it will safely fallback to i-x in UI
       const rangeMatch = instruction.match(/([A-Z])\s*(?:[-–]|to)\s*([A-Z])/);
       if (rangeMatch) {
          const startChar = rangeMatch[1].toUpperCase().charCodeAt(0);
          const endChar = rangeMatch[2].toUpperCase().charCodeAt(0);
          if (startChar <= endChar && endChar - startChar < 26) {
             for (let c = startChar; c <= endChar; c++) {
               const charStr = String.fromCharCode(c);
               choices.push({ id: charStr, label: charStr, text: `Paragraph/Option ${charStr}` });
             }
          }
       }

       for (const line of lines) {
         const m = line.match(qRegex);
         if (m) {
           const qOrder = parseInt(m[1], 10);
           if (qOrder >= rangeStart && qOrder <= rangeEnd) {
             questions.push({
               questionOrder: qOrder,
               questionText: m[2].trim(),
               correctAnswer: '',
               options: buildOptions(choices)
             });
           }
         }
       }
    } else if (['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN'].includes(detectedType)) {
       const qRegex = /^(\d+)[\.\)\-\s]\s*(.*)/;
       let choices = [];
       let tfngLegend = [];
       
       if (detectedType === 'TRUE_FALSE_NOT_GIVEN') {
         choices = [{label: 'TRUE', text: 'TRUE'}, {label: 'FALSE', text: 'FALSE'}, {label: 'NOT GIVEN', text: 'NOT GIVEN'}];
         
         const legendRegex = /TRUE\s+([^\n]+)\n+FALSE\s+([^\n]+)\n+NOT GIVEN\s+([^\n]+)/i;
         const legendMatch = instruction.match(legendRegex);
         if (legendMatch) {
            tfngLegend = [
              { label: 'TRUE', text: legendMatch[1].trim() },
              { label: 'FALSE', text: legendMatch[2].trim() },
              { label: 'NOT GIVEN', text: legendMatch[3].trim() }
            ];
            instruction = instruction.replace(legendRegex, '').trim();
         }
       } else {
         choices = [{label: 'YES', text: 'YES'}, {label: 'NO', text: 'NO'}, {label: 'NOT GIVEN', text: 'NOT GIVEN'}];
         
         const legendRegex = /YES\s+([^\n]+)\n+NO\s+([^\n]+)\n+NOT GIVEN\s+([^\n]+)/i;
         const legendMatch = instruction.match(legendRegex);
         if (legendMatch) {
            tfngLegend = [
              { label: 'YES', text: legendMatch[1].trim() },
              { label: 'NO', text: legendMatch[2].trim() },
              { label: 'NOT GIVEN', text: legendMatch[3].trim() }
            ];
            instruction = instruction.replace(legendRegex, '').trim();
         }
       }
         
       for (const line of lines) {
         const m = line.match(qRegex);
         if (m) {
           const qOrder = parseInt(m[1], 10);
           if (qOrder >= rangeStart && qOrder <= rangeEnd) {
             questions.push({
               questionOrder: qOrder,
               questionText: m[2].trim(),
               correctAnswer: '',
               options: buildOptions(choices, { tfngLegend })
             });
           }
         }
       }
    } else if (detectedType === 'MULTIPLE_CHOICE_SINGLE') {
       const qRegex = /^(\d+)[\.\)\-\s]\s*(.*)/;
       const optRegex = /^([A-Za-z])[\.\)]?\s+(.*)/;
       let curQ = null;
       
       for (const line of lines) {
         const m = line.match(qRegex);
         if (m) {
           if (curQ) questions.push(curQ);
           const qOrder = parseInt(m[1], 10);
           if (qOrder >= rangeStart && qOrder <= rangeEnd) {
             curQ = {
               questionOrder: qOrder,
               questionText: m[2].trim(),
               correctAnswer: '',
               options: buildOptions([])
             };
             curQ.options.choices = []; // strictly ensure choices exist
           } else {
             curQ = null;
           }
         } else if (curQ) {
           const optM = line.match(optRegex);
           if (optM) {
             curQ.options.choices.push({
               label: optM[1].toUpperCase(),
               text: optM[2].trim()
             });
           }
         }
       }
       if (curQ) questions.push(curQ);
    } else if (detectedType === 'MULTIPLE_CHOICE_MULTI') {
       const optRegex = /^([A-Za-z])[\.\)]?\s+(.*)/;
       const choices = [];
       for (const line of lines) {
         const optM = line.match(optRegex);
         if (optM) {
           choices.push({
             label: optM[1].toUpperCase(),
             text: optM[2].trim()
           });
         }
       }
       
       const maxSelections = rangeEnd - rangeStart + 1;
       const extraOptions = { maxSelections, isGrouped: true };
       
       for (let q = rangeStart; q <= rangeEnd; q++) {
         questions.push({
           questionOrder: q,
           questionText: '',
           correctAnswer: '',
           options: buildOptions(choices, extraOptions)
         });
       }
    } else if (detectedType === 'SENTENCE_COMPLETION') {
       let fullText = lines.join('\n');
       
       for (let q = rangeStart; q <= rangeEnd; q++) {
         let qText = '';
         const qLines = fullText.split('\n');
         
         for (let i = 0; i < qLines.length; i++) {
            const l = qLines[i].trim();
            if (!l) continue;
            
            // If it starts with "36. ", the blank is already inside the text
            const startMatchDot = l.match(new RegExp(`^${q}\\.\\s+(.*)`));
            if (startMatchDot) {
              qText = startMatchDot[1];
              break;
            }
            
            // If it starts with "5 ", it might be the blank itself at the start
            const startMatchNoDot = l.match(new RegExp(`^${q}\\s+(.*)`));
            if (startMatchNoDot) {
              qText = `_____ ` + startMatchNoDot[1];
              break;
            }
            
            if (l === `${q}`) {
               const prev = i > 0 ? qLines[i-1].trim() : '';
               const next = i < qLines.length - 1 ? qLines[i+1].trim() : '';
               qText = `${prev} _____ ${next}`.trim();
               break;
            }
            
            const inlineRegex = new RegExp(`(^|\\s)${q}(\\s|$)`);
            if (l.match(inlineRegex)) {
              qText = l.replace(inlineRegex, '$1_____$2').trim();
              break;
            }
         }
         
         if (qText) {
           questions.push({
             questionOrder: q,
             questionText: qText,
             correctAnswer: '',
             options: buildOptions([])
           });
         }
       }
    } else {
       // UNKNOWN_TYPE: Try to at least parse numbered questions
       const qRegex = /^(\d+)\.\s+(.*)/;
       for (const line of lines) {
         const m = line.match(qRegex);
         if (m) {
           const qOrder = parseInt(m[1], 10);
           if (qOrder >= rangeStart && qOrder <= rangeEnd) {
             questions.push({
               questionOrder: qOrder,
               questionText: m[2].trim(),
               correctAnswer: '',
               options: buildOptions([])
             });
           }
         }
       }
    }

    parsedBlock.questions = questions;
    
    if (questions.length < qCount) {
      parsedBlock.warnings.push(`Chỉ tìm thấy ${questions.length}/${qCount} câu hỏi trong khoảng ${groupRange}`);
    }
    
    // Missing answers are calculated again at the end
    finalBlocks.push({
      id: Date.now() + Math.random(),
      questionType: detectedType,
      type: detectedType,
      range: groupRange,
      instruction: instruction,
      warnings: parsedBlock.warnings,
      questions: questions,
      options: []
    });
  }

  if (duplicateAnsError) {
     return { blocks: [], errors: [duplicateAnsError] };
  }

  const allParsedQNums = new Set();
  for (const block of finalBlocks) {
    for (const q of block.questions) {
      allParsedQNums.add(q.questionOrder);
    }
  }

  for (const qNumStr of Object.keys(answerMap)) {
    if (!allParsedQNums.has(parseInt(qNumStr, 10))) {
      return { blocks: [], errors: [`Answer key chứa đáp án cho câu hỏi không tồn tại (Câu ${qNumStr})`] };
    }
  }
  
  // Apply mapping
  for (const block of finalBlocks) {
    let missingAnsCount = 0;
    for (const q of block.questions) {
      const qNum = q.questionOrder;
      
      if (answerMap[qNum] !== undefined) {
        q.correctAnswer = answerMap[qNum];
        if (q.options) {
          q.options.requiresManualAnswer = false;
        }
      } else {
        missingAnsCount++;
      }
      
      if (explanationMap[qNum] !== undefined) {
        q.explanation = explanationMap[qNum];
      } else {
        q.explanation = '';
        if (answerMap[qNum] !== undefined) {
          // Has answer but no explanation -> warning
          block.warnings.push(`Câu ${qNum} có đáp án nhưng thiếu giải thích`);
        }
      }
    }
    
    if (missingAnsCount > 0) {
      block.warnings.push(`Còn ${missingAnsCount} câu chưa có đáp án`);
    }
  }

  return { blocks: finalBlocks, errors: null };
};

