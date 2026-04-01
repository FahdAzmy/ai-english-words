import 'server-only';

export type SupportedLLMProvider = 'mock' | 'openai' | 'gemini' | 'openrouter';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  text: string;
  provider: SupportedLLMProvider;
  model: string;
}

interface ProviderConfig {
  provider: SupportedLLMProvider;
  model: string;
}

export async function generateTextWithConfiguredProvider(
  request: LLMRequest
): Promise<LLMResult> {
  const config = resolveProviderConfig();

  switch (config.provider) {
    case 'openai':
      return generateWithOpenAI(config.model, request);
    case 'gemini':
      return generateWithGemini(config.model, request);
    case 'openrouter':
      return generateWithOpenRouter(config.model, request);
    case 'mock':
    default:
      return generateWithMock(config.model, request);
  }
}

function resolveProviderConfig(): ProviderConfig {
  const rawProvider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  const provider: SupportedLLMProvider =
    rawProvider === 'openai' ||
    rawProvider === 'gemini' ||
    rawProvider === 'openrouter'
      ? rawProvider
      : 'mock';

  if (provider === 'openai') {
    return {
      provider,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  if (provider === 'gemini') {
    return {
      provider,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }

  if (provider === 'openrouter') {
    return {
      provider,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    };
  }

  return {
    provider: 'mock',
    model: 'mock-story-model',
  };
}

async function generateWithOpenAI(
  model: string,
  request: LLMRequest
): Promise<LLMResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for OpenAI provider.');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI response was empty.');
  }

  return { text, provider: 'openai', model };
}

async function generateWithGemini(
  model: string,
  request: LLMRequest
): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY for Gemini provider.');
  }

  const baseUrl =
    process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const endpoint = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 900,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${details}`);
  }

  const json = await response.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part: { text?: string }) => part?.text || '')
        .join('\n')
        .trim()
    : '';

  if (!text) {
    throw new Error('Gemini response was empty.');
  }

  return { text, provider: 'gemini', model };
}

async function generateWithOpenRouter(
  model: string,
  request: LLMRequest
): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY for OpenRouter provider.');
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.OPENROUTER_SITE_URL
        ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
        : {}),
      ...(process.env.OPENROUTER_SITE_NAME
        ? { 'X-Title': process.env.OPENROUTER_SITE_NAME }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${details}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenRouter response was empty.');
  }

  return { text, provider: 'openrouter', model };
}

function generateWithMock(model: string, request: LLMRequest): LLMResult {
  const joinedPrompt = `${request.systemPrompt}\n${request.userPrompt}`;
  const words = extractCandidateWords(joinedPrompt);

  const story = `At sunrise, ${words[0] || 'the learner'} opened a notebook and began a focused study session. ${
    words[1] || 'Patience'
  } guided each sentence, and ${
    words[2] || 'discipline'
  } helped connect new ideas with older lessons. By evening, ${
    words[3] || 'confidence'
  } replaced doubt, while ${
    words[4] || 'progress'
  } became visible in every paragraph.`;

  return {
    text: story,
    provider: 'mock',
    model,
  };
}

function extractCandidateWords(input: string): string[] {
  const lines = input.split('\n');
  const vocabulary = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').split(':')[0]?.trim())
    .filter(Boolean);

  return vocabulary.slice(0, 5);
}
