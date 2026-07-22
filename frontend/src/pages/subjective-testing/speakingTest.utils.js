const parseSpeakingQuestions = (content) => {
  if (!content) return [];
  if (Array.isArray(content)) {
    return content.map((item, idx) => (
      typeof item === 'string' ? { id: `q${idx + 1}`, text: item } : item
    ));
  }

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, idx) => ({ id: `q${idx + 1}`, text }));
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const restorePendingSpeakingSubmission = (session) => {
  try {
    const activeSession = session
      ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
    const groupId = activeSession?.getItem('speaking:pending-group');
    if (!groupId) return null;
    if (!UUID.test(groupId)) {
      activeSession.removeItem('speaking:pending-group');
      return null;
    }
    return { speaking_group_id: groupId, job_id: 'restored', status: 'queued' };
  } catch {
    return null;
  }
};

export const buildSpeakingParts = (passages = []) => passages.map((passage, idx) => {
  if (idx === 0) {
    return {
      partName: passage.title || 'Part 1: Introduction and Interview',
      promptId: passage.id,
      description: passage.instruction || 'Answer questions about yourself and familiar topics.',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  if (idx === 1) {
    return {
      partName: passage.title || 'Part 2: Long Turn',
      promptId: passage.id,
      description: passage.instruction || 'Cue card bullet points',
      prompt: passage.title && passage.title !== 'Speaking Part 2' ? passage.title : passage.content || '',
      bulletPoints: passage.content || '',
      preparationTime: 60,
      speakingTime: 120,
      duration: '3-4 phút'
    };
  }
  if (idx === 2) {
    return {
      partName: passage.title || 'Part 3: Discussion',
      promptId: passage.id,
      description: passage.instruction || 'Follow-up discussion',
      questions: parseSpeakingQuestions(passage.content),
      duration: '4-5 phút'
    };
  }
  return {
    partName: passage.title || `Part ${idx + 1}`,
    promptId: passage.id,
    description: passage.instruction || '',
    prompt: passage.content || '',
    questions: parseSpeakingQuestions(passage.content),
    duration: '4-5 phút'
  };
});
