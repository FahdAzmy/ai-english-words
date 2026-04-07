export interface DailySentenceVocabularyWord {
  word: string;
  definition: string;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export interface GenerateDailySentenceInput {
  dayId: string;
  currentDayNumber: number;
  words: DailySentenceVocabularyWord[];
  requestNonce?: string;
}

export interface GenerateDailySentenceOutput {
  text: string;
  provider: string;
  model: string;
  wordsRequested: string[];
  wordsUsed: string[];
}

export function buildDailySentencePrompts(input: GenerateDailySentenceInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const currentDayWords = input.words.filter((word) => word.isCurrentDay);
  const previousDayWords = input.words.filter((word) => !word.isCurrentDay);

  const currentDayBlock = currentDayWords
    .map((word) => `- ${word.word}: ${word.definition}`)
    .join('\n');

  const previousDaysBlock = previousDayWords
    .map((word) => `- Day ${word.sourceDayNumber} - ${word.word}: ${word.definition}`)
    .join('\n');

  const totalWords = input.words.length;
  const sentenceTarget = Math.max(10, Math.min(24, totalWords + 3));

  return {
    systemPrompt: [
      'You are an English tutor creating practical daily-life example sentences.',
      'Use natural English.',
      'You must use every listed vocabulary word at least once.',
      'Current-day and previous-day words are all required.',
      'Output exactly one sentence per line with no numbering.',
      'Do not include markdown fences.',
    ].join(' '),
    userPrompt: [
      `Current day: Day ${input.currentDayNumber}.`,
      `Variation nonce: ${input.requestNonce || 'none'}.`,
      `Generate ${sentenceTarget} practical, clear daily-life sentences.`,
      'Every listed word below must appear at least once in the output.',
      '',
      'Current-day vocabulary:',
      currentDayBlock || '- none',
      '',
      'Previous-day vocabulary (also required):',
      previousDaysBlock || '- none',
    ].join('\n'),
  };
}

export function extractDailySentenceUsedWords(
  text: string,
  words: DailySentenceVocabularyWord[]
): string[] {
  return words
    .map((word) => word.word)
    .filter((word) => {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      return regex.test(text);
    });
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
