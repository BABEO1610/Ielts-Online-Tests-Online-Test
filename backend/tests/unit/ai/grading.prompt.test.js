const {
  buildSystemPrompt,
  buildUserPrompt,
} = require('../../../src/ai/grading.prompt');

describe('grading.prompt', () => {
  it('uses Task Achievement for Writing Task 1', () => {
    const prompt = buildSystemPrompt('task1');

    expect(prompt).toContain('Task Achievement');
    expect(prompt).toContain('clear overview');
    expect(prompt).toContain('specific data points');
    expect(prompt).not.toContain('Task Response criteria');
  });

  it('uses Task Response for Writing Task 2', () => {
    const prompt = buildSystemPrompt('task2');

    expect(prompt).toContain('Task Response');
    expect(prompt).toContain('clear, consistent position');
    expect(prompt).toContain('reasoning/examples');
    expect(prompt).not.toContain('Task 1 — Task Achievement criteria');
  });

  it('distinguishes IELTS minimum from system grading threshold', () => {
    const prompt = buildUserPrompt({
      taskType: 'task2',
      questionPrompt: 'Discuss both views.',
      studentAnswer: 'Short answer with enough system words.',
      wordCount: 140,
      ieltsMinWords: 250,
      testTitle: 'Writing mock',
    });

    expect(prompt).toContain('Student word count: 140');
    expect(prompt).toContain('IELTS minimum words: 250');
    expect(prompt).toContain('under IELTS word requirement');
  });
});
