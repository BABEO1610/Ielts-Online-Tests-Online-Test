const { ERROR_CODES, createAssistantError } = require('../api/assistant/assistant.constants');

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_GENERATE_CONTENT_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const normalizeProvider = (provider) => String(provider || 'openai').trim().toLowerCase();

const getGeminiApiKey = () =>
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

const normalizeGeminiModel = (model) => {
  const value = String(model || '').trim();
  if (!value || value === 'gemini') {
    return 'gemini-flash-lite-latest';
  }
  return value;
};

const getAiConfig = () => ({
  provider: normalizeProvider(process.env.AI_PROVIDER || 'openai'),
  model: process.env.AI_MODEL || 'gpt-4o-mini',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: getGeminiApiKey(),
});

const sanitizeProviderError = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .slice(0, 700);
};

const buildProviderError = ({ provider, status, model, body }) => {
  const sanitized = sanitizeProviderError(body);

  if (status === 429) {
    return createAssistantError(
      ERROR_CODES.AI_QUOTA_EXCEEDED,
      `${provider} API đã hết quota hoặc chưa được cấp quota cho model "${model}". Hãy kiểm tra Google AI Studio quota/billing hoặc đổi sang API key/project còn quota.`
    );
  }

  return createAssistantError(
    ERROR_CODES.INTERNAL_ERROR,
    `${provider} API lỗi ${status} khi gọi model "${model}". ${sanitized || 'Không có response body.'}`
  );
};

const buildSystemPrompt = (mode) => (
  [
    'Bạn là trợ lý IELTS của website IELTSZone.',
    'Chỉ trả lời trong phạm vi nội dung IELTS website được cung cấp.',
    'Không bịa test, lesson, đáp án, explanation hoặc band score.',
    'Không chấm Writing/Speaking trong phase này.',
    'Nếu context không đủ dữ liệu chính thức, hãy nói rõ là hệ thống chưa có đủ dữ liệu.',
    'Trả lời ngắn gọn, rõ ràng, phù hợp học viên beginner/intermediate.',
    mode === 'review'
      ? 'Ở chế độ review, chỉ giải thích dựa trên question, selected answer, correct answer, explanation, passage/transcript chính thức.'
      : 'Ở chế độ general, hỗ trợ tìm test, lesson, skill, topic, level, study tips cơ bản và navigation trong website.',
  ].join('\n')
);

const buildUserPrompt = ({ message, officialContext }) => (
  [
    'Official context:',
    officialContext || 'No official context available.',
    '',
    'Student question:',
    message,
  ].join('\n')
);

const resolvePrompts = ({ mode, message, officialContext, systemPrompt, userPrompt }) => ({
  systemPrompt: systemPrompt || buildSystemPrompt(mode),
  userPrompt: userPrompt || buildUserPrompt({ message, officialContext }),
});

const generateOpenAiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 450,
      messages: [
        { role: 'system', content: prompts.systemPrompt },
        { role: 'user', content: prompts.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw buildProviderError({
      provider: 'OpenAI',
      status: response.status,
      model,
      body: errorText,
    });
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }

  return answer;
};

const generateGeminiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const geminiModel = normalizeGeminiModel(model);
  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const response = await fetch(
    `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompts.systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 450,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompts.userPrompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw buildProviderError({
      provider: 'Gemini',
      status: response.status,
      model: geminiModel,
      body: errorText,
    });
  }

  const data = await response.json();
  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!answer) {
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }

  return answer;
};

const generateAssistantAnswer = async ({ mode, message, officialContext, systemPrompt, userPrompt }) => {
  const { provider, model, openaiApiKey, geminiApiKey } = getAiConfig();

  if (provider === 'gemini' || provider === 'google' || provider === 'google-ai-studio') {
    return generateGeminiAnswer({
      model,
      apiKey: geminiApiKey,
      mode,
      message,
      officialContext,
      systemPrompt,
      userPrompt,
    });
  }

  if (provider === 'openai') {
    return generateOpenAiAnswer({
      model,
      apiKey: openaiApiKey,
      mode,
      message,
      officialContext,
      systemPrompt,
      userPrompt,
    });
  }

  throw createAssistantError(
    ERROR_CODES.AI_NOT_CONFIGURED,
    `AI_PROVIDER không được hỗ trợ: ${provider}. Hãy dùng gemini hoặc openai.`
  );
};

const parseSseLines = async ({ response, onJson }) => {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim());

      for (const line of lines) {
        if (!line || line === '[DONE]') continue;
        try {
          const text = onJson(JSON.parse(line)) || '';
          fullText += text;
        } catch {
          // Ignore malformed provider stream chunks.
        }
      }
    }
  }

  return fullText;
};

const streamOpenAiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, onDelta }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 450,
      stream: true,
      messages: [
        { role: 'system', content: prompts.systemPrompt },
        { role: 'user', content: prompts.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw buildProviderError({
      provider: 'OpenAI',
      status: response.status,
      model,
      body: errorText,
    });
  }

  const text = await parseSseLines({
    response,
    onJson: (data) => {
      const delta = data?.choices?.[0]?.delta?.content || '';
      if (delta) onDelta(delta);
      return delta;
    },
  });

  return text.trim();
};

const streamGeminiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, onDelta }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const geminiModel = normalizeGeminiModel(model);
  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const response = await fetch(
    `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompts.systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 450,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompts.userPrompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw buildProviderError({
      provider: 'Gemini',
      status: response.status,
      model: geminiModel,
      body: errorText,
    });
  }

  const text = await parseSseLines({
    response,
    onJson: (data) => {
      const delta = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('') || '';
      if (delta) onDelta(delta);
      return delta;
    },
  });

  return text.trim();
};

const streamAssistantAnswer = async ({ mode, message, officialContext, systemPrompt, userPrompt, onDelta }) => {
  const { provider, model, openaiApiKey, geminiApiKey } = getAiConfig();

  if (provider === 'gemini' || provider === 'google' || provider === 'google-ai-studio') {
    return streamGeminiAnswer({
      model,
      apiKey: geminiApiKey,
      mode,
      message,
      officialContext,
      systemPrompt,
      userPrompt,
      onDelta,
    });
  }

  if (provider === 'openai') {
    return streamOpenAiAnswer({
      model,
      apiKey: openaiApiKey,
      mode,
      message,
      officialContext,
      systemPrompt,
      userPrompt,
      onDelta,
    });
  }

  throw createAssistantError(
    ERROR_CODES.AI_NOT_CONFIGURED,
    `AI_PROVIDER khÃ´ng Ä‘Æ°á»£c há»— trá»£: ${provider}. HÃ£y dÃ¹ng gemini hoáº·c openai.`
  );
};

const generateTranscript = async (audioUrl) => {
  const { openaiApiKey, geminiApiKey } = getAiConfig();
  
  if (!openaiApiKey && !geminiApiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED, "Không tìm thấy OPENAI_API_KEY hay GEMINI_API_KEY.");
  }

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'audio/webm';

  // If OpenAI is configured, prefer Whisper
  if (openaiApiKey) {
    let ext = 'webm';
    if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = 'mp3';
    if (contentType.includes('wav')) ext = 'wav';
    if (contentType.includes('mp4')) ext = 'mp4';
    
    const blob = new Blob([arrayBuffer], { type: contentType });
    const formData = new FormData();
    formData.append('file', blob, `audio.${ext}`);
    formData.append('model', 'whisper-1');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw buildProviderError({
        provider: 'OpenAI Whisper',
        status: whisperResponse.status,
        model: 'whisper-1',
        body: errorText,
      });
    }

    const data = await whisperResponse.json();
    return data.text;
  }

  // Fallback to Gemini
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  const geminiModel = 'gemini-flash-lite-latest';
  
  const geminiResponse = await fetch(
    `${GEMINI_GENERATE_CONTENT_URL}/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Please transcribe the following audio into text exactly as it is spoken. Do not add any extra commentary, translations, or formatting. Just output the pure transcription of what you hear." },
            {
              inlineData: {
                mimeType: contentType,
                data: base64Audio
              }
            }
          ]
        }]
      })
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    throw buildProviderError({
      provider: 'Gemini',
      status: geminiResponse.status,
      model: geminiModel,
      body: errorText,
    });
  }

  const data = await geminiResponse.json();
  const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!transcript) {
    throw new Error('Gemini returned empty transcription');
  }
  return transcript.trim();
};

module.exports = {
  generateAssistantAnswer,
  streamAssistantAnswer,
  generateTranscript,
  getAiConfig,
  normalizeGeminiModel,
};
