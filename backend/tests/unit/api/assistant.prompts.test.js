const { ASSISTANT_INTENTS } = require('../../../src/api/assistant/assistant.intent');
const {
  buildSystemPrompt,
  buildUserPrompt,
} = require('../../../src/api/assistant/assistant.prompts');

describe('Assistant prompts', () => {
  it('uses IELTS and English-learning prompt for IELTS_KNOWLEDGE', () => {
    const prompt = buildSystemPrompt(ASSISTANT_INTENTS.IELTS_KNOWLEDGE);

    expect(prompt).toContain('IELTS and English learning assistant');
    expect(prompt).toContain('recent conversation');
    expect(prompt).toContain('Writing Task 2 outline');
    expect(prompt).toContain('translation requests');
    expect(prompt).toContain('same language as the user');
    expect(prompt).toContain('safe general IELTS or English-learning knowledge');
    expect(prompt).toContain('Do not simply copy retrieved chunks');
    expect(prompt).toContain('Return JSON only');
  });

  it('injects recent conversation into the user prompt', () => {
    const prompt = buildUserPrompt({
      message: 'lap cho toi dan y cua writing part 2',
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        sessionMemory: [
          { role: 'user', content: 'tip hoc ielts the nao' },
          { role: 'assistant', content: 'De hoc IELTS hieu qua...' },
        ],
        databaseResults: [],
      },
    });

    expect(prompt).toContain('Recent conversation:');
    expect(prompt).toContain('User: tip hoc ielts the nao');
    expect(prompt).toContain('Assistant: De hoc IELTS hieu qua');
    expect(prompt).toContain('Student question:');
  });

  it('injects retrieved IELTS knowledge into a dedicated prompt block', () => {
    const prompt = buildUserPrompt({
      message: 'Matching headings lam sao de khong sai nhieu?',
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        sessionMemory: [],
        databaseResults: [],
        knowledgeResults: [{
          id: 'reading_matching_headings_main_idea',
          title: 'Matching Headings Means Main Idea',
          skill: 'reading',
          questionType: 'matching_headings',
          content: 'Matching Headings tests the main idea of each paragraph.',
        }],
      },
    });

    expect(prompt).toContain('Retrieved IELTS Knowledge:');
    expect(prompt).toContain('Chunk 1:');
    expect(prompt).toContain('Title: Matching Headings Means Main Idea');
    expect(prompt).toContain('Question Type: matching_headings');
  });

  it('adds Vietnamese answer language and style instruction for Vietnamese questions', () => {
    const prompt = buildUserPrompt({
      message: 'phân biệt although và despite',
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        sessionMemory: [],
        databaseResults: [],
        knowledgeResults: [],
        knowledgeDebug: {
          detectedTopic: 'english_grammar',
          noMatch: true,
          usedKnowledgeBase: false,
        },
      },
    });

    expect(prompt).toContain('Language and answer style:');
    expect(prompt).toContain('Answer language: Vietnamese.');
    expect(prompt).toContain('Quy tắc chính');
    expect(prompt).toContain('No retrieved IELTS knowledge.');
  });

  it('adds English answer language and style instruction for English questions', () => {
    const prompt = buildUserPrompt({
      message: 'how can I improve my vocabulary?',
      contextInjection: {
        mode: ASSISTANT_INTENTS.IELTS_KNOWLEDGE,
        sessionMemory: [],
        databaseResults: [],
        knowledgeResults: [],
        knowledgeDebug: {
          detectedTopic: 'english_vocabulary',
          noMatch: true,
          usedKnowledgeBase: false,
        },
      },
    });

    expect(prompt).toContain('Language and answer style:');
    expect(prompt).toContain('Answer language: English.');
    expect(prompt).toContain('Main rule');
    expect(prompt).toContain('No retrieved IELTS knowledge.');
  });
});
