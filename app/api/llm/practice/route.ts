import { NextResponse } from 'next/server';
import {
  buildPracticePrompts,
  extractUsedWords,
  type GeneratePracticeInput,
  type PracticeMode,
} from '@/lib/llm/practice-generator';
import { generateTextWithConfiguredProvider } from '@/lib/llm/providers';

const VALID_MODES: PracticeMode[] = ['sentences', 'dialogue', 'writing', 'music'];

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
        { error: 'Invalid request body. "mode" must be one of: sentences, dialogue, writing, music.' },
        { status: 400 }
      );
    }

    const normalizedInput: GeneratePracticeInput = {
      mode,
      dayId: body.dayId || 'unknown_day',
      currentDayNumber: body.currentDayNumber,
      requestNonce: body.requestNonce?.trim() || undefined,
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

    const inputForPrompt: GeneratePracticeInput =
      mode === 'dialogue'
        ? {
            ...normalizedInput,
            requestNonce:
              normalizedInput.requestNonce ||
              `dialogue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            words: shuffleWords(normalizedInput.words),
          }
        : normalizedInput;

    const prompts = buildPracticePrompts(inputForPrompt);
    let generated = await generateTextWithConfiguredProvider({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      temperature: mode === 'dialogue' ? 0.9 : 0.7,
      maxTokens: 900,
    });

    let wordsUsed = extractUsedWords(generated.text, normalizedInput.words);

    if (mode === 'dialogue') {
      const requiredDayWords = dedupeWords(
        normalizedInput.words
          .filter((word) => word.isCurrentDay)
          .map((word) => word.word)
      );
      const requiredWords = requiredDayWords.length > 0
        ? requiredDayWords
        : dedupeWords(normalizedInput.words.map((word) => word.word));

      let missingWords = computeMissingWords(requiredWords, wordsUsed);

      if (missingWords.length > 0) {
        const strictGenerated = await generateTextWithConfiguredProvider({
          systemPrompt: `${prompts.systemPrompt} STRICT REQUIREMENT: include every required current-day word at least once.`,
          userPrompt: [
            prompts.userPrompt,
            '',
            `Required current-day words (must all appear): ${requiredWords.join(', ') || 'none'}.`,
            `Missing words from previous attempt: ${missingWords.join(', ') || 'none'}.`,
          ].join('\n'),
          temperature: 0.45,
          maxTokens: 1000,
        });

        const strictWordsUsed = extractUsedWords(strictGenerated.text, normalizedInput.words);
        const strictMissingWords = computeMissingWords(requiredWords, strictWordsUsed);

        if (
          countCoveredRequiredWords(requiredWords, strictWordsUsed) >=
          countCoveredRequiredWords(requiredWords, wordsUsed)
        ) {
          generated = strictGenerated;
          wordsUsed = strictWordsUsed;
          missingWords = strictMissingWords;
        }
      }

      if (missingWords.length > 0) {
        const patchedText = appendMissingDialogueLines(generated.text, missingWords);
        generated = { ...generated, text: patchedText };
        wordsUsed = extractUsedWords(generated.text, normalizedInput.words);
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

function shuffleWords<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;

    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(word);
  }

  return unique;
}

function computeMissingWords(requiredWords: string[], usedWords: string[]): string[] {
  const usedSet = new Set(usedWords.map((word) => word.toLowerCase()));
  return requiredWords.filter((word) => !usedSet.has(word.toLowerCase()));
}

function countCoveredRequiredWords(requiredWords: string[], usedWords: string[]): number {
  return requiredWords.length - computeMissingWords(requiredWords, usedWords).length;
}

function appendMissingDialogueLines(text: string, missingWords: string[]): string {
  if (missingWords.length === 0) return text;

  const trimmed = text.trim();
  const lines = trimmed.length > 0 ? trimmed.split(/\r?\n/) : [];
  const lastLine = lines[lines.length - 1] || '';
  const startsWithB = /^B:/i.test(lastLine.trim());
  let nextSpeaker: 'A' | 'B' = startsWithB ? 'A' : 'B';

  const extraLines = missingWords.map((word) => {
    const line = `${nextSpeaker}: I will practice the word ${word} in this sentence.`;
    nextSpeaker = nextSpeaker === 'A' ? 'B' : 'A';
    return line;
  });

  return [...lines, ...extraLines].join('\n').trim();
}
