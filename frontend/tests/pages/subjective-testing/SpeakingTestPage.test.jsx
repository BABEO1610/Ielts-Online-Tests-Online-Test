import { describe, expect, it, vi } from 'vitest';
import {
  buildSpeakingParts,
  restorePendingSpeakingSubmission,
} from '../../../src/pages/subjective-testing/speakingTest.utils';

describe('SpeakingTestPage async submission data', () => {
  it('preserves the authoritative prompt id for all three Parts', () => {
    const passages = [1, 2, 3].map((part) => ({
      id: `prompt-${part}`,
      title: `Part ${part}`,
      instruction: `Instruction ${part}`,
      content: `Question ${part}`,
    }));
    const parts = buildSpeakingParts(passages);
    expect(parts).toHaveLength(3);
    expect(parts.map((part) => part.promptId)).toEqual(['prompt-1', 'prompt-2', 'prompt-3']);
  });

  it('restores only a valid pending AI group after refresh', () => {
    const session = {
      getItem: () => '11111111-1111-4111-8111-111111111111',
      removeItem: () => { throw new Error('must not remove a valid group'); },
    };
    expect(restorePendingSpeakingSubmission(session)).toEqual(expect.objectContaining({
      speaking_group_id: '11111111-1111-4111-8111-111111111111',
      job_id: 'restored',
    }));
    const removeItem = vi.fn();
    expect(restorePendingSpeakingSubmission({ getItem: () => '../invalid', removeItem })).toBeNull();
    expect(removeItem).toHaveBeenCalledWith('speaking:pending-group');
  });
});
