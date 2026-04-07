import { NextResponse } from 'next/server';
import { generateTextWithConfiguredProvider } from '@/lib/llm/providers';
import {
  buildSentenceExamPrompts,
  type SentenceExamItem,
  type SentenceExamMode,
  type SentenceExamOverall,
  type SentenceExamRequest,
  type SentenceExamResponse,
} from '@/lib/llm/sentence-exam';

const MAX_ITEMS = 40;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SentenceExamRequest>;
    const mode = body?.mode;

    if (mode !== 'single' && mode !== 'batch') {
      return NextResponse.json(
        { error: 'Invalid request body. "mode" must be "single" or "batch".' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.sentences) || body.sentences.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. "sentences" must be a non-empty array.' },
        { status: 400 }
      );
    }

    if (body.sentences.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Too many sentences. Maximum allowed is ${MAX_ITEMS}.` },
        { status: 400 }
      );
    }

    if (mode === 'single' && body.sentences.length !== 1) {
      return NextResponse.json(
        { error: 'For "single" mode, provide exactly one sentence item.' },
        { status: 400 }
      );
    }

    const normalizedInput: SentenceExamRequest = {
      mode,
      dayId: body.dayId?.trim() || 'unknown_day',
      currentDayNumber:
        typeof body.currentDayNumber === 'number' ? body.currentDayNumber : undefined,
      sentences: body.sentences
        .map((item) => ({
          word: item.word?.trim() || '',
          definition: item.definition?.trim() || '',
          sentence: item.sentence?.trim() || '',
        }))
        .filter((item) => item.word.length > 0),
    };

    if (normalizedInput.sentences.length === 0) {
      return NextResponse.json(
        { error: 'No valid sentence items were provided.' },
        { status: 400 }
      );
    }

    if (normalizedInput.sentences.some((item) => item.sentence.length === 0)) {
      return NextResponse.json(
        { error: 'Every sentence item must include a non-empty "sentence".' },
        { status: 400 }
      );
    }

    const prompts = buildSentenceExamPrompts(normalizedInput);

    try {
      const generated = await generateTextWithConfiguredProvider({
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
        temperature: 0.2,
        maxTokens: 1400,
      });

      const parsed = parseProviderReviewResponse(
        generated.text,
        mode,
        normalizedInput.sentences
      );

      if (!parsed) {
        throw new Error('Provider response did not match the expected JSON schema.');
      }

      const response: SentenceExamResponse = {
        mode,
        provider: generated.provider,
        model: generated.model,
        results: parsed.results,
        overall: parsed.overall,
      };

      return NextResponse.json(response);
    } catch (providerError) {
      console.error('[v0] Sentence exam provider parsing failed, using local fallback:', providerError);

      const fallback = buildLocalSentenceExam(mode, normalizedInput.sentences);
      return NextResponse.json({
        mode,
        provider: 'local_fallback',
        model: 'rule-based-v1',
        results: fallback.results,
        overall: fallback.overall,
      } satisfies SentenceExamResponse);
    }
  } catch (error) {
    console.error('[v0] Sentence exam failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while examining sentences.',
      },
      { status: 500 }
    );
  }
}

function parseProviderReviewResponse(
  text: string,
  mode: SentenceExamMode,
  sourceItems: SentenceExamRequest['sentences']
): { results: SentenceExamItem[]; overall: SentenceExamOverall } | null {
  const parsed = parseJsonFromText(text);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
  if (rawResults.length === 0) {
    return null;
  }

  const normalizedResults: SentenceExamItem[] = sourceItems.map((sourceItem, index) => {
    const raw = rawResults[index] || {};
    const weakPoints = Array.isArray(raw.weakPoints)
      ? raw.weakPoints
          .map((value: unknown) => String(value || '').trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const sentence = String(raw.sentence || sourceItem.sentence || '').trim();
    const word = String(raw.word || sourceItem.word || '').trim();
    const isWordUsed =
      typeof raw.isWordUsed === 'boolean'
        ? raw.isWordUsed
        : containsTargetWord(sentence, sourceItem.word);
    const score = clampScore(Number(raw.score));

    const fallbackReview = reviewSentenceWithRules(sourceItem.word, sourceItem.sentence);

    return {
      word: word || sourceItem.word,
      sentence: sentence || sourceItem.sentence,
      score: Number.isFinite(score) ? score : fallbackReview.score,
      isWordUsed,
      feedback:
        String(raw.feedback || '').trim() || fallbackReview.feedback,
      betterSentence:
        String(raw.betterSentence || '').trim() || fallbackReview.betterSentence,
      weakPoints: weakPoints.length > 0 ? weakPoints : fallbackReview.weakPoints,
    };
  });

  const rawOverall = parsed.overall || {};
  const overallFromProvider: SentenceExamOverall = {
    generalFeedback: String(rawOverall.generalFeedback || '').trim(),
    repeatedWeakPoints: Array.isArray(rawOverall.repeatedWeakPoints)
      ? rawOverall.repeatedWeakPoints
          .map((value: unknown) => String(value || '').trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    nextSteps: Array.isArray(rawOverall.nextSteps)
      ? rawOverall.nextSteps
          .map((value: unknown) => String(value || '').trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
  };

  const localOverall = buildOverallFeedback(normalizedResults);

  const overall: SentenceExamOverall = {
    generalFeedback:
      overallFromProvider.generalFeedback || localOverall.generalFeedback,
    repeatedWeakPoints:
      overallFromProvider.repeatedWeakPoints.length > 0
        ? overallFromProvider.repeatedWeakPoints
        : localOverall.repeatedWeakPoints,
    nextSteps:
      overallFromProvider.nextSteps.length > 0
        ? overallFromProvider.nextSteps
        : localOverall.nextSteps,
  };

  if (mode === 'single') {
    overall.repeatedWeakPoints = normalizedResults[0]?.weakPoints || [];
  }

  return {
    results: normalizedResults,
    overall,
  };
}

function parseJsonFromText(text: string): any | null {
  const direct = tryJsonParse(text.trim());
  if (direct) return direct;

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = text.slice(firstBrace, lastBrace + 1);
    const parsedSliced = tryJsonParse(sliced);
    if (parsedSliced) return parsedSliced;
  }

  return null;
}

function tryJsonParse(input: string): any | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function buildLocalSentenceExam(
  mode: SentenceExamMode,
  items: SentenceExamRequest['sentences']
): Pick<SentenceExamResponse, 'results' | 'overall'> {
  const results = items.map((item) => reviewSentenceWithRules(item.word, item.sentence));
  const overall = buildOverallFeedback(results);

  if (mode === 'single') {
    overall.repeatedWeakPoints = results[0]?.weakPoints || [];
  }

  return {
    results,
    overall,
  };
}

function reviewSentenceWithRules(word: string, sentence: string): SentenceExamItem {
  const trimmedSentence = sentence.trim();
  const normalizedWord = word.trim();
  const wordCount = trimmedSentence ? trimmedSentence.split(/\s+/).length : 0;

  let score = 100;
  const weakPoints: string[] = [];
  const wordUsed = containsTargetWord(trimmedSentence, normalizedWord);

  if (!wordUsed) {
    score -= 35;
    weakPoints.push('Target word is missing or unclear.');
  }

  if (wordCount < 6) {
    score -= 20;
    weakPoints.push('Sentence is too short to show meaning clearly.');
  }

  if (!startsWithCapital(trimmedSentence)) {
    score -= 10;
    weakPoints.push('Start the sentence with a capital letter.');
  }

  if (!endsWithPunctuation(trimmedSentence)) {
    score -= 10;
    weakPoints.push('End the sentence with proper punctuation.');
  }

  if (hasImmediateWordRepetition(trimmedSentence)) {
    score -= 10;
    weakPoints.push('Avoid repeating the same word unnecessarily.');
  }

  const clampedScore = clampScore(score);

  let feedback = '';
  if (weakPoints.length === 0) {
    feedback =
      'Strong sentence. The target word is used clearly and the sentence is complete.';
  } else if (clampedScore >= 70) {
    feedback = `Good effort. Improve these points: ${weakPoints.join(' ')}`;
  } else {
    feedback = `Keep practicing. Focus on these points first: ${weakPoints.join(' ')}`;
  }

  return {
    word: normalizedWord,
    sentence: trimmedSentence,
    score: clampedScore,
    isWordUsed: wordUsed,
    feedback,
    betterSentence: buildBetterSentenceSuggestion(trimmedSentence, normalizedWord),
    weakPoints,
  };
}

function buildOverallFeedback(results: SentenceExamItem[]): SentenceExamOverall {
  const weakPointFrequency = new Map<string, number>();
  let totalScore = 0;

  for (const result of results) {
    totalScore += result.score;
    for (const weakPoint of result.weakPoints) {
      weakPointFrequency.set(weakPoint, (weakPointFrequency.get(weakPoint) || 0) + 1);
    }
  }

  const repeatedWeakPoints = Array.from(weakPointFrequency.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .slice(0, 5);

  const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
  const generalFeedback =
    averageScore >= 85
      ? 'Overall performance is strong. Keep writing longer, natural sentences to build fluency.'
      : averageScore >= 65
        ? 'You are on the right track. Keep improving sentence structure and target-word usage.'
        : 'Focus on sentence basics first: complete idea, correct target word usage, and punctuation.';

  const nextSteps = [
    'Write one extra sentence per word using a different context.',
    'Read each sentence aloud once and fix unclear parts.',
    'Check that every sentence starts with a capital letter and ends with punctuation.',
  ];

  return {
    generalFeedback,
    repeatedWeakPoints,
    nextSteps,
  };
}

function buildBetterSentenceSuggestion(sentence: string, word: string): string {
  const trimmedSentence = sentence.trim();
  const fallback = `Today, I used "${word}" in a clear sentence to practice English.`;

  if (!trimmedSentence) return fallback;

  if (!containsTargetWord(trimmedSentence, word)) {
    return fallback;
  }

  let improved = trimmedSentence;
  improved = ensureCapitalized(improved);
  improved = ensureEndingPunctuation(improved);

  if (improved.split(/\s+/).length < 6) {
    return `${improved.replace(/[.!?]+$/, '')} because it is useful in daily life.`;
  }

  return improved;
}

function startsWithCapital(sentence: string): boolean {
  const firstLetter = sentence.trim().match(/[A-Za-z]/)?.[0] || '';
  return firstLetter.length > 0 && firstLetter === firstLetter.toUpperCase();
}

function endsWithPunctuation(sentence: string): boolean {
  return /[.!?]$/.test(sentence.trim());
}

function ensureCapitalized(sentence: string): string {
  if (!sentence) return sentence;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function ensureEndingPunctuation(sentence: string): string {
  return endsWithPunctuation(sentence) ? sentence : `${sentence}.`;
}

function hasImmediateWordRepetition(sentence: string): boolean {
  const words = sentence
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9']/gi, ''))
    .filter(Boolean);

  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1]) {
      return true;
    }
  }

  return false;
}

function containsTargetWord(sentence: string, word: string): boolean {
  const normalizedWord = word.trim();
  if (!normalizedWord) return false;

  const regex = new RegExp(`\\b${escapeRegExp(normalizedWord)}\\b`, 'i');
  return regex.test(sentence);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

