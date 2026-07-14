const { ERROR_CODES, createAssistantError } = require('../api/assistant/assistant.constants');
const {
  normalizeOpenAiUsageMetadata,
  recordAiUsageLog,
} = require('./aiUsage.service');

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

  if (status === 400 && sanitized.includes('User location is not supported')) {
    return createAssistantError(
      ERROR_CODES.INTERNAL_ERROR,
      `Google đã chặn truy cập Gemini API từ khu vực của bạn (Việt Nam). Vui lòng bật phần mềm VPN (như 1.1.1.1 WARP hoặc ProtonVPN) trên máy tính của bạn và thử lại.`
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

const recordProviderUsage = ({
  usageContext = {},
  provider,
  model,
  data = null,
  usageMetadata = null,
  success,
  error = null,
  latencyMs,
}) => recordAiUsageLog({
  userId: usageContext.userId,
  feature: usageContext.feature,
  entityType: usageContext.entityType,
  entityId: usageContext.entityId,
  provider,
  model,
  responseId: data?.responseId || data?.id || null,
  usageMetadata,
  success,
  errorCode: error?.code || error?.errorCode || null,
  errorMessage: error?.message || null,
  latencyMs,
});

const generateOpenAiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, usageContext }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const startedAt = Date.now();

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompts.systemPrompt },
        { role: 'user', content: prompts.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = buildProviderError({
      provider: 'OpenAI',
      status: response.status,
      model,
      body: errorText,
    });
    await recordProviderUsage({
      usageContext,
      provider: 'openai',
      model,
      success: false,
      error,
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }

  const data = await response.json();
  // ponytail: SSE parser does not expose final token usage yet; log the real call with 0 tokens.
  // Upgrade by parsing provider final usage chunks when the API response includes them.
  await recordProviderUsage({
    usageContext,
    provider: 'openai',
    model,
    data,
    usageMetadata: normalizeOpenAiUsageMetadata(data?.usage),
    success: true,
    latencyMs: Date.now() - startedAt,
  });
  const answer = data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }

  return answer;
};

const generateGeminiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, usageContext }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const geminiModel = normalizeGeminiModel(model);
  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const startedAt = Date.now();
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
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
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
    const error = buildProviderError({
      provider: 'Gemini',
      status: response.status,
      model: geminiModel,
      body: errorText,
    });
    await recordProviderUsage({
      usageContext,
      provider: 'gemini',
      model: geminiModel,
      success: false,
      error,
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }

  const data = await response.json();
  // ponytail: SSE parser does not expose final token usage yet; log the real call with 0 tokens.
  // Upgrade by parsing provider final usage chunks when the API response includes them.
  await recordProviderUsage({
    usageContext,
    provider: 'gemini',
    model: geminiModel,
    data,
    usageMetadata: data?.usageMetadata,
    success: true,
    latencyMs: Date.now() - startedAt,
  });
  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!answer) {
    throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
  }

  return answer;
};

const generateGeminiJsonAnswer = async ({
  model, apiKey, systemPrompt, userPrompt, timeoutMs = 30000, usageContext,
}) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const geminiModel = normalizeGeminiModel(model);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const error = buildProviderError({
        provider: 'Gemini',
        status: response.status,
        model: geminiModel,
        body: await response.text(),
      });
      await recordProviderUsage({
        usageContext,
        provider: 'gemini',
        model: geminiModel,
        success: false,
        error,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }

    const data = await response.json();
    await recordProviderUsage({
      usageContext,
      provider: 'gemini',
      model: geminiModel,
      data,
      usageMetadata: data?.usageMetadata,
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    if (!answer) throw createAssistantError(ERROR_CODES.INTERNAL_ERROR);
    return { answer, modelName: geminiModel, usageMetadata: data?.usageMetadata || null };
  } finally {
    clearTimeout(timeout);
  }
};

const generateScopeClassification = async ({ message, usageContext }) => {
  const { provider, model, openaiApiKey, geminiApiKey } = getAiConfig();
  const systemPrompt = `You are a strict JSON scope classifier for an IELTS learning platform.
Evaluate the student's message and classify its intent.
Return ONLY valid JSON matching this schema exactly:
{
  "intent": "IELTS_KNOWLEDGE" | "WEBSITE_HELP" | "CLARIFICATION" | "OUT_OF_SCOPE" | "FIND_TEST" | "FIND_LESSON",
  "allowed": boolean,
  "confidence": number (0.0 to 1.0),
  "reason": "short explanation",
  "skill": "reading" | "listening" | "writing" | "speaking" | "vocabulary" | "grammar" | null,
  "needsUserInput": boolean,
  "missingInput": null
}

ALLOWED SCOPES:
- If user wants to find, search, or asks about availability of mock tests, exams, practice tests -> intent is FIND_TEST.
- If user wants to find, search, or asks about availability of lessons, library resources, documents, audio, video -> intent is FIND_LESSON.
- IELTS Reading, Listening, Writing, Speaking
- IELTS grammar, vocabulary, paraphrase, sentence improvement
- IELTS test strategy, study tips, question types
- IELTS Writing Task 1/Task 2, Speaking Part 1/2/3
- Website help/navigation/features
- If user wants to paraphrase but didn't provide text, intent is CLARIFICATION, needsUserInput is true.
- If user wants to paraphrase a specific text, intent is IELTS_KNOWLEDGE, allowed is true.
- Small talk, casual greetings, or user preferences (e.g., how to address the user) -> intent is IELTS_KNOWLEDGE, allowed is true.
- If user asks website features, intent is WEBSITE_HELP, allowed is true.

BLOCKED SCOPES (set intent to OUT_OF_SCOPE, allowed to false):
- Coding/programming (React, JS, Python, etc.)
- Medical, financial, legal, political advice
- Non-IELTS Math/Physics/Chemistry
- Personal life advice unrelated to IELTS
- Grading/band score requests for Writing/Speaking directly in chat
- Requests to invent fake official tests`;

  if (provider === 'gemini' || provider === 'google' || provider === 'google-ai-studio') {
    if (!geminiApiKey) throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
    const geminiModel = normalizeGeminiModel(model);
    const startedAt = Date.now();
    const response = await fetch(
      `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
          contents: [{ role: 'user', parts: [{ text: message }] }],
        }),
      }
    );
    if (!response.ok) {
      const error = buildProviderError({ provider: 'Gemini', status: response.status, model: geminiModel, body: await response.text() });
      await recordProviderUsage({
        usageContext,
        provider: 'gemini',
        model: geminiModel,
        success: false,
        error,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }
    const data = await response.json();
    await recordProviderUsage({
      usageContext,
      provider: 'gemini',
      model: geminiModel,
      data,
      usageMetadata: data?.usageMetadata,
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  }

  if (provider === 'openai') {
    if (!openaiApiKey) throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
    const startedAt = Date.now();
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });
    if (!response.ok) {
      const error = buildProviderError({ provider: 'OpenAI', status: response.status, model, body: await response.text() });
      await recordProviderUsage({
        usageContext,
        provider: 'openai',
        model,
        success: false,
        error,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }
    const data = await response.json();
    await recordProviderUsage({
      usageContext,
      provider: 'openai',
      model,
      data,
      usageMetadata: normalizeOpenAiUsageMetadata(data?.usage),
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return data?.choices?.[0]?.message?.content || '{}';
  }

  throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED, `Unsupported provider: ${provider}`);
};

const generateAssistantAnswer = async ({ mode, message, officialContext, systemPrompt, userPrompt, usageContext }) => {
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
      usageContext,
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
      usageContext,
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

const streamOpenAiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, onDelta, usageContext }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const startedAt = Date.now();
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: prompts.systemPrompt },
        { role: 'user', content: prompts.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = buildProviderError({
      provider: 'OpenAI',
      status: response.status,
      model,
      body: errorText,
    });
    await recordProviderUsage({
      usageContext,
      provider: 'openai',
      model,
      success: false,
      error,
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }

  const text = await parseSseLines({
    response,
    onJson: (data) => {
      const delta = data?.choices?.[0]?.delta?.content || '';
      if (delta) onDelta(delta);
      return delta;
    },
  });

  await recordProviderUsage({
    usageContext,
    provider: 'openai',
    model,
    success: true,
    latencyMs: Date.now() - startedAt,
  });
  return text.trim();
};

const streamGeminiAnswer = async ({ model, apiKey, mode, message, officialContext, systemPrompt, userPrompt, onDelta, usageContext }) => {
  if (!apiKey) {
    throw createAssistantError(ERROR_CODES.AI_NOT_CONFIGURED);
  }

  const geminiModel = normalizeGeminiModel(model);
  const prompts = resolvePrompts({ mode, message, officialContext, systemPrompt, userPrompt });
  const startedAt = Date.now();
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
    const error = buildProviderError({
      provider: 'Gemini',
      status: response.status,
      model: geminiModel,
      body: errorText,
    });
    await recordProviderUsage({
      usageContext,
      provider: 'gemini',
      model: geminiModel,
      success: false,
      error,
      latencyMs: Date.now() - startedAt,
    });
    throw error;
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

  await recordProviderUsage({
    usageContext,
    provider: 'gemini',
    model: geminiModel,
    success: true,
    latencyMs: Date.now() - startedAt,
  });
  return text.trim();
};

const streamAssistantAnswer = async ({ mode, message, officialContext, systemPrompt, userPrompt, onDelta, usageContext }) => {
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
      usageContext,
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
      usageContext,
    });
  }

  throw createAssistantError(
    ERROR_CODES.AI_NOT_CONFIGURED,
    `AI_PROVIDER khÃ´ng Ä‘Æ°á»£c há»— trá»£: ${provider}. HÃ£y dÃ¹ng gemini hoáº·c openai.`
  );
};

const generateTranscript = async (audioUrl, usageContext = {}) => {
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

    const startedAt = Date.now();
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      const error = buildProviderError({
        provider: 'OpenAI Whisper',
        status: whisperResponse.status,
        model: 'whisper-1',
        body: errorText,
      });
      await recordProviderUsage({
        usageContext,
        provider: 'openai',
        model: 'whisper-1',
        success: false,
        error,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }

    const data = await whisperResponse.json();
    await recordProviderUsage({
      usageContext,
      provider: 'openai',
      model: 'whisper-1',
      data,
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return data.text;
  }

  // Fallback to Gemini
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  const geminiModel = 'gemini-flash-lite-latest';
  
  const startedAt = Date.now();
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
    const error = buildProviderError({
      provider: 'Gemini',
      status: geminiResponse.status,
      model: geminiModel,
      body: errorText,
    });
    await recordProviderUsage({
      usageContext,
      provider: 'gemini',
      model: geminiModel,
      success: false,
      error,
      latencyMs: Date.now() - startedAt,
    });
    throw error;
  }

  const data = await geminiResponse.json();
  await recordProviderUsage({
    usageContext,
    provider: 'gemini',
    model: geminiModel,
    data,
    usageMetadata: data?.usageMetadata,
    success: true,
    latencyMs: Date.now() - startedAt,
  });
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
  generateGeminiJsonAnswer,
  generateScopeClassification,
  getAiConfig,
  normalizeGeminiModel,
};
