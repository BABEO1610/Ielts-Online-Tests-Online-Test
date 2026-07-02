import { useState, useMemo } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseBulkText, parseAdvancedText, parseSmartText, validateParsedQuestions } from '../../utils/questionParser';

const SUPPORTED_TYPES = [
  'Multiple Choice',
  'True/False/Not Given',
  'Yes/No/Not Given',
  'Sentence Completion',
  'Summary Completion',
  'Note/Table/Flow-chart Completion',
  'Short-answer Questions'
];

const SMART_SAMPLE_P1 = `Questions 1-4
The text has 5 paragraphs (A - E). Which paragraph contains each of the following pieces of information?
1. A possible security problem
2. The cost of M-Pesa
3. An international service similar to M-Pesa
4. The fact that most Kenyans do not have a bank account

Questions 5-8
Complete the following sentences using NO MORE THAN THREE WORDS from the text for each gap.
5. Safaricom is the ___ mobile phone company in Kenya.
6. An M-Pesa account needs to be credited by ___
7. ___ companies are particularly interested in using M-Pesa.
8. Companies like Moneygram and Western Union have ___ the international money transfer market.

Questions 9-13
Do the statements on the next page agree with the information given in Reading Passage 1? In boxes 9 - 13 on your answer sheet, write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN If there is no information on this.
9. Most Kenyans working in urban areas have relatives in rural areas.
10. So far, most of the people using M-Pesa have used it to send small amounts of money.
11. M-Pesa can only be used by people using one phone network.
12. M-Pesa can be used to buy products and services.
13. The GSM Association is a consumer organisation.

[ANSWERS]
1. B
2. A
3. C
4. D
5. largest
6. bank transfer
7. foreign
8. dominated
9. TRUE
10. FALSE
11. NOT GIVEN
12. TRUE
13. FALSE

[EXPLANATIONS]
1. Explanation for question 1.
2. Explanation for question 2.
3. Explanation for question 3.
4. Explanation for question 4.
5. Explanation for question 5.
6. Explanation for question 6.
7. Explanation for question 7.
8. Explanation for question 8.
9. Explanation for question 9.
10. Explanation for question 10.
11. Explanation for question 11.
12. Explanation for question 12.
13. Explanation for question 13.`;

const SMART_SAMPLE_P2 = `Questions 14-17
Choose the correct heading for each paragraph from the list of headings below.
14. Paragraph A
15. Paragraph B
16. Paragraph C
17. Paragraph D

Questions 18-22
Choose the correct letter, A, B, C or D.
18. What is the main idea of the passage?
A. Option A
B. Option B
C. Option C
D. Option D
19. According to paragraph 2, what is true about X?
A. Option A
B. Option B
C. Option C
D. Option D
20. The author mentions Y in order to...
A. Option A
B. Option B
C. Option C
D. Option D
21. Which of the following is NOT mentioned?
A. Option A
B. Option B
C. Option C
D. Option D
22. The word "it" in line 10 refers to...
A. Option A
B. Option B
C. Option C
D. Option D

Questions 23-26
Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
NOTES
23. The first phase requires ___
24. Data is collected using ___
25. The final report must include ___
26. Participants receive ___

[ANSWERS]
14. ii
15. iv
16. vi
17. ix
18. B
19. C
20. A
21. D
22. B
23. planning
24. sensors
25. statistics
26. compensation

[EXPLANATIONS]
14. Explanation for question 14.
15. Explanation for question 15.
16. Explanation for question 16.
17. Explanation for question 17.
18. Explanation for question 18.
19. Explanation for question 19.
20. Explanation for question 20.
21. Explanation for question 21.
22. Explanation for question 22.
23. Explanation for question 23.
24. Explanation for question 24.
25. Explanation for question 25.
26. Explanation for question 26.`;

const SMART_SAMPLE_P3 = `Questions 27-30
Do the following statements agree with the claims of the writer in Reading Passage 3? In boxes 27-30 on your answer sheet, write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.
27. The project was ultimately successful.
28. More funding is required for future research.
29. The public is largely unaware of this issue.
30. The government will change its policy next year.

Questions 31-35
Choose FIVE letters, A-I. Which FIVE of the following statements are true about the system?
A. Option A
B. Option B
C. Option C
D. Option D
E. Option E
F. Option F
G. Option G
H. Option H
I. Option I

Questions 36-40
Complete the sentences below. Choose NO MORE THAN ONE WORD from the passage for each answer.
36. The research showed that ___ is a major factor in urban development.
37. Cities with higher rates of ___ tend to grow faster.
38. There are challenges related to ___ which must be addressed.
39. These issues must be handled by the local ___.
40. Finally, the study highlights the need for better ___ in the future.

[ANSWERS]
27. YES
28. YES
29. NOT GIVEN
30. NO
31. A
32. C
33. E
34. G
35. I
36. infrastructure
37. employment
38. pollution
39. council
40. education

[EXPLANATIONS]
27. Explanation for question 27.
28. Explanation for question 28.
29. Explanation for question 29.
30. Explanation for question 30.
31. Explanation for question 31.
32. Explanation for question 32.
33. Explanation for question 33.
34. Explanation for question 34.
35. Explanation for question 35.
36. Explanation for question 36.
37. Explanation for question 37.
38. Explanation for question 38.
39. Explanation for question 39.
40. Explanation for question 40.`;

const SMART_SAMPLE_L1 = `Questions 1-5
The housing officer takes some details from the girl. Complete the following form with NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.

1. First name
2. Passport number
3. Course enrolled
4. Length of the course
5. Homestay time

Question 6
Mark TWO letters that represent the correct answer. Which kind of family does the girl prefer?

A. A big family with many young children
B. A family without smoker or drinkers
C. A family without any pets
D. A family with many animals or pets

Questions 7-10
Fill in the blanks with NO MORE THAN THREE WORDS for each answer.

7. Although the girl is not a vegetarian, she doesn't eat a lot of meat. Her favourite food is
8. The girls has given up playing handball. Now, she just play ___ with her friends at weekends.
9. The girl does not like the bus because they are always late. She would rather ___.
10. The girl can get the information about the homestay family that she wants ___.

[ANSWERS]
1. Yuichini
2. J190283
3. Advanced English
4. 4 months
5. 3 months
6. B
6. C
7. seafood
8. tennis
9. cycle
10. on the internet

[EXPLANATIONS]
1. Explanation for question 1.
2. Explanation for question 2.
3. Explanation for question 3.
4. Explanation for question 4.
5. Explanation for question 5.
6. Explanation for question 6.
7. Explanation for question 7.
8. Explanation for question 8.
9. Explanation for question 9.
10. Explanation for question 10.`;

const SMART_SAMPLE_L2 = `Questions 11-20
You will hear a talk by a tour guide about travel to Enzia. Complete the notes by filling in the blanks with NO MORE THAN THREE WORDS AND/OR NUMBER for each answer.

11. Normal visas last ___
12. You need to pay ___ for the visa.
13. Some Enzian consulates neighbouring countries require you to provide a letter to ___
14. You can get information of major embassies on ___ of the student handbook.
15. If you carry a lot of money, you need to complete a ___
16. Remember to declare all your items, especially expensive items, on a ___
17. You are advised to carry a health certificate. The one you need is the ___
18. If you wish to get a youth fare card, you should show your ___
19. Due to the bureaucracy in Eznia, you are advised to take at least ___ passport photos with you.
20. Pounds and US dollars are not very useful now in Eznia, so you should take Yen or ___ with you.

[ANSWERS]
11. 90 days
12. $20
13. immigration
14. page 10
15. form
16. customs form
17. yellow fever certificate
18. student ID
19. 4
20. Euros

[EXPLANATIONS]
11. Explanation for question 11.
12. Explanation for question 12.
13. Explanation for question 13.
14. Explanation for question 14.
15. Explanation for question 15.
16. Explanation for question 16.
17. Explanation for question 17.
18. Explanation for question 18.
19. Explanation for question 19.
20. Explanation for question 20.`;

const SMART_SAMPLE_L3 = `Questions 21-24
Complete the sentences below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.

21. The woman being interviewed is now working in the bank. Her occupation is ___
22. The woman usually spends about ___ when she goes shopping.
23. The woman often goes to ___ because she finds them convenient.
24. According to the woman, ___ is/are her most difficult thing(s) to buy.

Questions 25-27
Fill in the blanks with ONE WORD AND/OR A NUMBER for each answer.

25. 50% of the people being interviewed spend ___ a month.
26. 15% of the people being interviewed spend ___ a month.
27. 35% of the people being interviewed spend ___ a month.

Questions 28-30
Mark THREE letters that represent the correct answer. Most of the people being interviewed think that _________ is/are most difficult to buy.

A. Books
B. Study materials
C. Foods
D. Trousers
E. Shoes
F. Sportswear

[ANSWERS]
21. accountant
22. $50
23. supermarkets
24. clothes
25. $100
26. $200
27. $50
28. D
29. E
30. F

[EXPLANATIONS]
21. Explanation for question 21.
22. Explanation for question 22.
23. Explanation for question 23.
24. Explanation for question 24.
25. Explanation for question 25.
26. Explanation for question 26.
27. Explanation for question 27.
28. Explanation for question 28.
29. Explanation for question 29.
30. Explanation for question 30.`;

const SMART_SAMPLE_L4 = `Questions 31-40
Choose the correct letter, A, B, С or D.

31. What does the lecturer provide for those who are interested in doing extra reading?
A. Personal consultation sessions.
B. Extra materials, such as a booklist.
C. Mid-term examination.
D. Free glasses.
32. In the past, time management meant you needed to
A. reduce your stress.
B. plan for every hour of the week.
C. own a good watch.
D. set goals and try to achieve these goals.
33. Today, wise time management means you need to
A. set goals and work in a systematic way.
B. work faster.
C. set an overview of your assignment.
D. make a list, plan for everything and try to stick to this plan.
34. In this college, students are assigned ____________ at the end of each semester.
A. team projects.
B. final term examinations.
C. essays.
D. time management courses.
35. One sign he lecturer mentions that students feel under pressure is
A. library books go missing.
B. students get angry for no reason.
C. lower class attendance rates.
D. trouble at the library.
36. What kind of suggestion does the lecturer give to the students?
A. Making a very detailed plan of their daily activities.
B. Not being so stressed just because there is an assignment.
C. A regular one-hour session in their personal timetables.
D. Wearing comfortable shoes.
37. According to the lecturer, there are three kinds of planners. They are:
A. one weekly planner, one daily planner and one hour planner.
B. one yearly planner, one weekly planner and one daily planner.
C. one term planner, one monthly planner and one weekly planner.
D. one term planner, one weekly and one daily planner.
38. If you want to set an overview of your time, you should need at least
A. one week.
B. half a week.
C. one month.
D. one term.
39. The daily planner of time is mainly concerned with
A. the detailed planning.
B. how to plan all available time.
C. TV schedules.
D. an overview of everything you need to do for several days.
40. According to the lecturer, wise time management may have the following benefit:
A. having more time to spend on relaxation and other activities.
B. improving your performance in the final term assignment.
C. helping you write better essays.
D. improving your memory.

[ANSWERS]
31. B
32. D
33. A
34. C
35. A
36. C
37. D
38. B
39. A
40. A

[EXPLANATIONS]
31. Explanation for question 31.
32. Explanation for question 32.
33. Explanation for question 33.
34. Explanation for question 34.
35. Explanation for question 35.
36. Explanation for question 36.
37. Explanation for question 37.
38. Explanation for question 38.
39. Explanation for question 39.
40. Explanation for question 40.`;

function BulkAddModal({ onClose, onConfirm, testType = 'reading' }) {
  const [mode, setMode] = useState('simple'); // 'simple', 'advanced', 'smart'
  const [blockType, setBlockType] = useState('');
  const [rawText, setRawText] = useState('');
  
  const { blocks, validationErrors } = useMemo(() => {
    if (!rawText.trim()) return { blocks: [], validationErrors: null };
    
    if (mode === 'smart') {
      const { blocks: parsedBlocks, errors } = parseSmartText(rawText);
      return { blocks: parsedBlocks || [], validationErrors: errors };
    } else if (mode === 'advanced') {
      const { blocks: parsedBlocks, errors } = parseAdvancedText(rawText);
      return { blocks: parsedBlocks || [], validationErrors: errors };
    } else {
      if (!blockType) return { blocks: [], validationErrors: null };
      
      const { questions: parsedQs, error: parseError } = parseBulkText(rawText, blockType);
      if (parseError) return { blocks: [], validationErrors: [parseError] };
      
      const vError = validateParsedQuestions(parsedQs, blockType);
      if (vError) return { blocks: [], validationErrors: [vError] };
      
      return { 
        blocks: [{ type: blockType, questions: parsedQs }], 
        validationErrors: null 
      };
    }
  }, [rawText, blockType, mode]);

  const handleConfirm = () => {
    if (validationErrors && validationErrors.length > 0) return;
    if (!blocks || blocks.length === 0) return;
    
    if (mode === 'smart') {
      onConfirm(blocks);
      return;
    }

    const newBlocks = blocks.map((b, index) => ({
      id: Date.now() + index,
      type: b.type,
      range: `1-${b.questions.length}`,
      questions: b.questions,
      options: []
    }));
    
    onConfirm(newBlocks);
  };

  const handleInsertSmartSample = (part) => {
    if (rawText.trim()) {
      const confirm = window.confirm("Bạn có chắc muốn chèn mẫu không? Dữ liệu hiện tại sẽ bị ghi đè.");
      if (!confirm) return;
    }
    if (testType === 'reading') {
      if (part === 1) setRawText(SMART_SAMPLE_P1);
      else if (part === 2) setRawText(SMART_SAMPLE_P2);
      else if (part === 3) setRawText(SMART_SAMPLE_P3);
    } else {
      if (part === 1) setRawText(SMART_SAMPLE_L1);
      else if (part === 2) setRawText(SMART_SAMPLE_L2);
      else if (part === 3) setRawText(SMART_SAMPLE_L3);
      else if (part === 4) setRawText(SMART_SAMPLE_L4);
    }
  };

  const getFormatHint = () => {
    if (mode === 'smart') {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu Smart Mode (đề nguyên bản):</strong><br />
          <code>
            Questions 1-4<br/>
            Which paragraph contains each of the following pieces of information?<br/>
            1. A possible security problem<br/>
            2. The cost of M-Pesa<br/>
          </code>
        </div>
      );
    }

    if (mode === 'advanced') {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu Advanced:</strong><br />
          <code>
            [MCQ]<br/>
            1. Câu hỏi là gì?<br/>
            A. Sai<br/>
            *B. Đúng<br/>
            <br/>
            [T/F/NG]<br/>
            2. Con mèo kêu gâu gâu.<br/>
            *FALSE
          </code>
        </div>
      );
    }

    if (blockType === 'Multiple Choice') {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Câu hỏi là gì?<br/>
            A. Sai<br/>
            *B. Đúng<br/>
            C. Sai<br/>
            Giải thích: Vì sao lại đúng.
          </code>
        </div>
      );
    }
    if (['True/False/Not Given', 'Yes/No/Not Given'].includes(blockType)) {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Con mèo kêu gâu gâu.<br/>
            *FALSE<br/>
            Giải thích: Vì con mèo kêu meo meo.
          </code>
        </div>
      );
    }
    if (blockType) {
      return (
        <div className="bg-light p-2 mb-3 rounded" style={{ fontSize: '0.85rem' }}>
          <strong>Format mẫu:</strong><br />
          <code>
            1. Điền vào chỗ trống: ____.<br/>
            *Đáp án đúng<br/>
            Giải thích: Tìm thấy ở đoạn 2.
          </code>
        </div>
      );
    }
    return null;
  };

  const isConfirmDisabled = () => {
    if (!rawText.trim()) return true;
    if (validationErrors && validationErrors.length > 0) return true;
    if (mode === 'simple' && !blockType) return true;
    if (blocks.length === 0) return true;
    return false;
  };

  return (
    <div className="modal-backdrop" style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content bg-white rounded shadow-lg" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header p-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="m-0">Nhập Nhanh Câu Hỏi (Bulk Add)</h5>
          <button className="btn-close" aria-label="Close" onClick={onClose}></button>
        </div>
        
        <div className="modal-body p-3 overflow-auto" style={{ flex: 1 }}>
          <div className="alert alert-info py-2 d-flex flex-column" style={{ fontSize: '0.9rem' }}>
            <span className="mb-2">Giúp thêm nhanh câu hỏi bằng cách copy & paste. Vui lòng chọn chế độ:</span>
            <div className="d-flex gap-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="modeRadio" id="modeSimple" checked={mode === 'simple'} onChange={() => { setMode('simple'); setRawText(''); }} />
                <label className="form-check-label fw-bold" htmlFor="modeSimple">Simple Mode</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="modeRadio" id="modeAdvanced" checked={mode === 'advanced'} onChange={() => { setMode('advanced'); setRawText(''); }} />
                <label className="form-check-label fw-bold" htmlFor="modeAdvanced">Advanced Mode (Markers)</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="modeRadio" id="modeSmart" checked={mode === 'smart'} onChange={() => { setMode('smart'); setRawText(''); }} />
                <label className="form-check-label fw-bold" htmlFor="modeSmart">Smart Mode (IELTS Raw Text)</label>
              </div>
            </div>
          </div>
          
          <div className="row h-100">
            <div className="col-md-6 h-100 d-flex flex-column">
              {mode === 'simple' && (
                <>
                  <label className="form-label fw-bold">1. Chọn loại câu hỏi</label>
                  <select 
                    className="form-select mb-3" 
                    value={blockType} 
                    onChange={e => setBlockType(e.target.value)}
                  >
                    <option value="">-- Vui lòng chọn --</option>
                    {SUPPORTED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </>
              )}
              {mode === 'advanced' && (
                <div className="mb-2 text-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                  Chế độ Advanced: Hệ thống tự chia khối câu hỏi dựa trên các thẻ Marker `[MCQ]`, `[T/F/NG]`...
                </div>
              )}
              {mode === 'smart' && (
                <div className="mb-2 text-success fw-bold" style={{ fontSize: '0.9rem' }}>
                  Chế độ Smart: Tự động chia khối dựa trên pattern `Questions X-Y`. Không cần marker.
                </div>
              )}
              
              {getFormatHint()}
              
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-bold mb-0">{mode !== 'simple' ? '1' : '2'}. Dán văn bản vào đây</label>
                {mode === 'smart' && testType === 'reading' && (
                  <div className="d-flex gap-2">
                    <span className="text-muted" style={{fontSize: '0.8rem', alignSelf: 'center'}}>Mẫu:</span>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(1)}>P1 (Q1-13)</button>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(2)}>P2 (Q14-26)</button>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(3)}>P3 (Q27-40)</button>
                  </div>
                )}
                {mode === 'smart' && testType === 'listening' && (
                  <div className="d-flex gap-2">
                    <span className="text-muted" style={{fontSize: '0.8rem', alignSelf: 'center'}}>Mẫu:</span>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(1)}>P1 (Q1-10)</button>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(2)}>P2 (Q11-20)</button>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(3)}>P3 (Q21-30)</button>
                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => handleInsertSmartSample(4)}>P4 (Q31-40)</button>
                  </div>
                )}
              </div>
              <textarea 
                className="form-control flex-grow-1"
                style={{ resize: 'none', minHeight: '300px' }}
                placeholder={mode === 'advanced' ? "Ví dụ:\n[MCQ]\n1. Câu hỏi\n*A. Đáp án" : mode === 'smart' ? "Dán đề IELTS (Questions 1-4...) vào đây..." : "Dán nội dung vào đây..."}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                disabled={mode === 'simple' && !blockType}
              />
            </div>
            
            <div className="col-md-6 h-100 d-flex flex-column border-start ps-3">
              <label className="form-label fw-bold">{mode !== 'simple' ? '2' : '3'}. Kết quả (Preview)</label>
              
              <div className="flex-grow-1 overflow-auto bg-light rounded p-2" style={{ border: '1px solid #dee2e6' }}>
                {!rawText.trim() && (
                  <div className="text-center text-muted mt-5">
                    <em>Văn bản trống</em>
                  </div>
                )}
                {rawText.trim() && validationErrors && validationErrors.length > 0 && (
                  <div className="alert alert-danger d-flex align-items-start gap-2">
                    <AlertTriangle size={20} className="mt-1" />
                    <div>
                      <strong>Đã phát hiện lỗi:</strong>
                      <ul className="mb-0 mt-1 ps-3">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                
                {rawText.trim() && (!validationErrors || validationErrors.length === 0) && blocks.length > 0 && (
                  <div>
                    <div className="alert alert-success d-flex align-items-center gap-2 py-2">
                      <CheckCircle size={18} />
                      Nhận diện thành công {blocks.length} khối ({blocks.reduce((acc, b) => {
                        let qCount = 0;
                        if (b.questions) {
                          for (const q of b.questions) {
                            if (q.questionNumbers) qCount += q.questionNumbers.length;
                            else qCount += 1;
                          }
                        }
                        return acc + qCount;
                      }, 0)} câu hỏi).
                    </div>
                    
                    {blocks.map((block, bIdx) => (
                      <div key={bIdx} className="mb-4">
                        <div className="badge bg-secondary mb-2 fs-6">{mode === 'smart' ? `${block.type} (Q${block.range})` : block.type}</div>
                        {mode === 'smart' && block.warnings && block.warnings.length > 0 && (
                           <div className="alert alert-warning py-1 px-2 mb-2" style={{fontSize: '0.8rem'}}>
                             {block.warnings.map((w, wI) => <div key={wI}>⚠️ {w}</div>)}
                           </div>
                        )}
                        {block.questions && block.questions.map((q, qIdx) => {
                          // Handle multiple types of question shape
                          const text = q.text || q.questionText;
                          const correct = q.correctAnswer || q.correctAnswers;
                          
                          return (
                            <div key={qIdx} className="card mb-2 border-0 shadow-sm border-start border-4 border-primary">
                              <div className="card-body p-2" style={{ fontSize: '0.85rem' }}>
                                <div className="fw-bold mb-1">
                                  Câu {q.questionNumbers && q.questionNumbers.length > 1 ? `${q.questionNumbers[0]}-${q.questionNumbers[q.questionNumbers.length - 1]}` : (q.questionOrder || (qIdx + 1))}: {text}
                                </div>
                                
                                {q.options && q.options.choices && q.options.choices.length > 0 && (
                                  <ul className="list-unstyled ms-3 mb-1">
                                    {q.options.choices.map((opt, oIdx) => (
                                      <li key={oIdx}>
                                        {opt.label}. {opt.text}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {(block.type === 'Multiple Choice' || (q.options && Array.isArray(q.options))) && !q.options?.choices && (
                                  <ul className="list-unstyled ms-3 mb-1">
                                    {Array.isArray(q.options) && q.options.map((opt, oIdx) => (
                                      <li key={opt.id || oIdx} style={{ color: (correct && correct.includes(opt.id)) ? 'var(--success)' : 'inherit', fontWeight: (correct && correct.includes(opt.id)) ? 'bold' : 'normal' }}>
                                        {String.fromCharCode(65 + oIdx)}. {opt.text} {(correct && correct.includes(opt.id)) && '✓'}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                
                                {(!Array.isArray(q.options) || block.type !== 'Multiple Choice') && !q.options?.choices && (
                                  <>
                                    {correct ? (
                                      <div className="text-success fw-bold ms-3 mb-1">
                                        Đáp án: {Array.isArray(correct) ? correct.join(', ') : correct}
                                      </div>
                                    ) : (
                                      mode === 'smart' && (
                                        <div className="text-warning fw-bold ms-3 mb-1" style={{ fontSize: '0.8rem' }}>
                                          ⚠️ Missing answer
                                        </div>
                                      )
                                    )}
                                  </>
                                )}
                                
                                {q.explanation ? (
                                  <div className="text-muted ms-3 fst-italic">
                                    Giải thích: {q.explanation}
                                  </div>
                                ) : (
                                  mode === 'smart' && correct && (
                                    <div className="text-secondary ms-3 mb-1" style={{ fontSize: '0.8rem' }}>
                                      ⚠️ Missing explanation
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer p-3 border-top d-flex justify-content-end gap-2">
          <button className="btn btn-light" onClick={onClose}>Hủy bỏ</button>
          <button 
            className="btn btn-primary" 
            disabled={isConfirmDisabled()}
            onClick={handleConfirm}
          >
            Xác nhận Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkAddModal;
