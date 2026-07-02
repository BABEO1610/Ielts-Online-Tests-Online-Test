const { evaluateGuardrails } = require('../../../src/api/assistant/assistant.guardrails');
const { ERROR_CODES } = require('../../../src/api/assistant/assistant.constants');

describe('Assistant guardrails', () => {
  it('blocks active test page requests', () => {
    const result = evaluateGuardrails({
      message: 'Vì sao câu 5 đáp án là B?',
      context: { pageType: 'active-test' },
    });

    expect(result.blocked).toBe(true);
    expect(result.code).toBe(ERROR_CODES.ASSISTANT_DISABLED_DURING_TEST);
  });

  it('blocks writing or speaking grading requests', () => {
    const result = evaluateGuardrails({
      message: 'Chấm bài Writing của em band mấy?',
      context: { pageType: 'home' },
    });

    expect(result.blocked).toBe(true);
    expect(result.code).toBe(ERROR_CODES.OUT_OF_SCOPE);
  });

  it('blocks clearly unrelated topics', () => {
    const result = evaluateGuardrails({
      message: 'Giá Bitcoin hôm nay thế nào?',
      context: { pageType: 'home' },
    });

    expect(result.blocked).toBe(true);
    expect(result.code).toBe(ERROR_CODES.OUT_OF_SCOPE);
  });

  it('blocks unrelated product buying advice', () => {
    const result = evaluateGuardrails({
      message: 'tư vấn mua điện thoại nào',
      context: { pageType: 'home' },
    });

    expect(result.blocked).toBe(true);
    expect(result.code).toBe(ERROR_CODES.OUT_OF_SCOPE);
  });

  it('allows normal IELTS content search questions', () => {
    const result = evaluateGuardrails({
      message: 'Có đề Reading về Environment không?',
      context: { pageType: 'home' },
    });

    expect(result.blocked).toBe(false);
  });
});
