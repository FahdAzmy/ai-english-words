import { NextResponse } from 'next/server';
import {
  buildDailySentencePrompts,
  extractDailySentenceUsedWords,
  type GenerateDailySentenceInput,
} from '@/lib/llm/daily-sentence';
import { generateTextWithConfiguredProvider } from '@/lib/llm/providers';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateDailySentenceInput>;

    if (!body || !Array.isArray(body.words) || body.words.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. "words" must be a non-empty array.' },
        { status: 400 }
      );
    }

    if (typeof body.currentDayNumber !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body. "currentDayNumber" must be a number.' },
        { status: 400 }
      );
    }

    const normalizedInput: GenerateDailySentenceInput = {
      dayId: body.dayId || 'unknown_day',
      currentDayNumber: body.currentDayNumber,
      requestNonce:
        body.requestNonce?.trim() ||
        `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      words: body.words
        .map((word) => ({
          word: word.word?.trim() || '',
          definition: word.definition?.trim() || '',
          sourceDayNumber: Number(word.sourceDayNumber) || body.currentDayNumber || 1,
          isCurrentDay: Boolean(word.isCurrentDay),
        }))
        .filter((word) => word.word.length > 0),
    };

    if (normalizedInput.words.length === 0) {
      return NextResponse.json(
        { error: 'No valid words were provided.' },
        { status: 400 }
      );
    }

    const shuffledInput: GenerateDailySentenceInput = {
      ...normalizedInput,
      words: shuffleWords(normalizedInput.words),
    };

    const prompts = buildDailySentencePrompts(shuffledInput);
    let generated = await generateTextWithConfiguredProvider({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      temperature: 0.9,
      maxTokens: 900,
    });

    let wordsUsed = extractDailySentenceUsedWords(generated.text, normalizedInput.words);

    if (wordsUsed.length < normalizedInput.words.length) {
      const missingWords = normalizedInput.words
        .map((word) => word.word)
        .filter((word) => !wordsUsed.some((used) => used.toLowerCase() === word.toLowerCase()));

      const retry = await generateTextWithConfiguredProvider({
        systemPrompt: `${prompts.systemPrompt} This is a strict retry. You must include every listed word.`,
        userPrompt: [
          prompts.userPrompt,
          '',
          `Missing words that must be included: ${missingWords.join(', ') || 'none'}.`,
        ].join('\n'),
        temperature: 0.4,
        maxTokens: 1000,
      });

      const retryWordsUsed = extractDailySentenceUsedWords(retry.text, normalizedInput.words);
      if (retryWordsUsed.length >= wordsUsed.length) {
        generated = retry;
        wordsUsed = retryWordsUsed;
      }
    }

    return NextResponse.json({
      text: generated.text,
      provider: generated.provider,
      model: generated.model,
      wordsRequested: normalizedInput.words.map((word) => word.word),
      wordsUsed,
    });
  } catch (error) {
    console.error('[v0] Daily sentence generation failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while generating daily sentences.',
      },
      { status: 500 }
    );
  }
}

function shuffleWords<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
