const {
  retrieveKnowledge,
  detectSkill,
  detectQuestionType,
  detectEnglishLearningTopic,
} = require('../../../src/api/assistant/assistant.knowledge-retriever');
const { clearKnowledgeBaseCacheForTests } = require('../../../src/api/assistant/assistant.knowledge-base');

describe('Assistant static knowledge retriever', () => {
  beforeEach(() => {
    clearKnowledgeBaseCacheForTests();
  });

  it('retrieves matching headings guide', () => {
    const result = retrieveKnowledge({
      message: 'Matching headings lam sao de khong sai nhieu?',
    });

    expect(result.knowledgeResults[0]).toMatchObject({
      skill: 'reading',
      questionType: 'matching_headings',
    });
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(true);
    expect(result.knowledgeDebug.selectedKnowledgeChunkIds).toEqual(
      expect.arrayContaining([expect.stringContaining('matching_headings')])
    );
  });

  it.each([
    'matching heading làm sao',
    'cách làm dạng nối tiêu đề',
    'dạng chọn tiêu đề làm thế nào',
    'dạng nối heading làm sao',
    'ý chính paragraph tìm sao',
    'how do I do matching headings?',
    'how can I avoid mistakes in matching headings?',
  ])('retrieves matching headings chunks for alias query: %s', (message) => {
    const result = retrieveKnowledge({ message });

    expect(result.knowledgeResults[0]).toMatchObject({
      skill: 'reading',
      questionType: 'matching_headings',
    });
    expect(result.knowledgeDebug.detectedSkill).toBe('reading');
    expect(result.knowledgeDebug.detectedQuestionType).toBe('matching_headings');
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(true);
    expect(result.knowledgeDebug.selectedKnowledgeChunkIds).toEqual(
      expect.arrayContaining([expect.stringContaining('matching_headings')])
    );
  });

  it('retrieves True False Not Given guide', () => {
    const result = retrieveKnowledge({
      message: 'True False Not Given khac False the nao?',
    });

    expect(result.knowledgeResults[0]).toMatchObject({
      skill: 'reading',
      questionType: 'true_false_not_given',
    });
    expect(result.knowledgeDebug.detectedQuestionType).toBe('true_false_not_given');
  });

  it('retrieves Writing Task 1 overview guide', () => {
    const result = retrieveKnowledge({
      message: 'Task 1 overview viet nhu the nao?',
    });

    expect(result.knowledgeResults[0]).toMatchObject({
      skill: 'writing',
      questionType: 'task1_overview',
    });
  });

  it('retrieves Task 2 essay type guidance', () => {
    const result = retrieveKnowledge({
      message: 'Discuss both views va agree disagree khac gi nhau?',
    });

    expect(result.knowledgeResults.map((chunk) => chunk.questionType)).toEqual(
      expect.arrayContaining(['discuss_both_views', 'agree_disagree'])
    );
    expect(result.knowledgeDebug.detectedSkill).toBe('writing');
  });

  it('does not inject unrelated chunks when there is no strong match', () => {
    const result = retrieveKnowledge({
      message: 'IELTS vocabulary for food topic',
    });

    expect(result.knowledgeResults).toEqual([]);
    expect(result.knowledgeDebug.noMatch).toBe(true);
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(false);
    expect(result.knowledgeDebug.selectedKnowledgeChunkIds).toEqual([]);
  });

  it.each([
    ['phân biệt although và despite', 'english_grammar'],
    ['how can I improve my vocabulary', 'english_vocabulary'],
    ['how do I pronounce difficult English words better?', 'english_pronunciation'],
  ])('keeps general English learning no-match without unrelated chunks: %s', (message, expectedTopic) => {
    const result = retrieveKnowledge({ message });

    expect(result.knowledgeResults).toEqual([]);
    expect(result.knowledgeDebug.detectedTopic).toBe(expectedTopic);
    expect(result.knowledgeDebug.detectedQuestionType).toBeNull();
    expect(result.knowledgeDebug.noMatch).toBe(true);
    expect(result.knowledgeDebug.usedKnowledgeBase).toBe(false);
    expect(result.knowledgeDebug.selectedKnowledgeChunkIds).toEqual([]);
  });

  it('caps chunk count and total injected content', () => {
    const result = retrieveKnowledge({
      message: 'reading true false not given matching headings common mistake strategy',
    });

    expect(result.knowledgeResults.length).toBeLessThanOrEqual(5);
    expect(result.knowledgeDebug.totalInjectedKnowledgeChars).toBeLessThanOrEqual(3000);
    result.knowledgeResults.forEach((chunk) => {
      expect(chunk.content.length).toBeLessThanOrEqual(800);
    });
  });

  it('detects skill and question type from common prompts', () => {
    expect(detectSkill('Writing Task 1 overview viet the nao')).toBe('writing');
    expect(detectQuestionType('Speaking Part 2 tra loi bao lau')).toBe('speaking_part_2');
    expect(detectEnglishLearningTopic('phân biệt although và despite')).toBe('english_grammar');
    expect(detectEnglishLearningTopic('how can I improve my vocabulary')).toBe('english_vocabulary');
  });
});
