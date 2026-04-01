import { NextResponse } from 'next/server';
import {
  buildPracticePrompts,
  extractUsedWords,
  type GeneratePracticeInput,
  type PracticeMode,
} from '@/lib/llm/practice-generator';
import { generateTextWithConfiguredProvider } from '@/lib/llm/providers';

const VALID_MODES: PracticeMode[] = ['sentences', 'dialogue', 'writing'];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GeneratePracticeInput>;

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

    const mode = body.mode;
    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid request body. "mode" must be one of: sentences, dialogue, writing.' },
        { status: 400 }
      );
    }

    const normalizedInput: GeneratePracticeInput = {
      mode,
      dayId: body.dayId || 'unknown_day',
      currentDayNumber: body.currentDayNumber,
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

    const prompts = buildPracticePrompts(normalizedInput);
    const generated = await generateTextWithConfiguredProvider({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      temperature: 0.7,
      maxTokens: 900,
    });

    const wordsUsed = extractUsedWords(generated.text, normalizedInput.words);

    return NextResponse.json({
      text: generated.text,
      provider: generated.provider,
      model: generated.model,
      wordsRequested: normalizedInput.words.map((word) => word.word),
      wordsUsed,
    });
  } catch (error) {
    console.error('[v0] Practice generation failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while generating practice content.',
      },
      { status: 500 }
    );
  }
}
