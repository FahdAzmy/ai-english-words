export type PracticeMode = 'sentences' | 'dialogue' | 'writing';

export interface PracticeVocabularyWord {
  word: string;
  definition: string;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export interface GeneratePracticeInput {
  mode: PracticeMode;
  dayId: string;
  currentDayNumber: number;
  words: PracticeVocabularyWord[];
}

export interface GeneratePracticeOutput {
  text: string;
  provider: string;
  model: string;
  wordsRequested: string[];
  wordsUsed: string[];
}

export function buildPracticePrompts(input: GeneratePracticeInput): {
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

  const commonRules = [
    'Use natural daily-life English.',
    'Prioritize clarity and usefulness over forcing rare vocabulary.',
    'Use all current-day words at least once.',
    'For previous-day words: include only if natural; skip any that would make output awkward or unclear.',
    'Do not include markdown fences.',
  ].join(' ');

  if (input.mode === 'sentences') {
    return {
      systemPrompt: `You are an English tutor creating practical daily-life example sentences. ${commonRules}`,
      userPrompt: [
        `Current day: Day ${input.currentDayNumber}.`,
        'Generate 8 to 12 practical, clear daily-life sentences.',
        'Output exactly one sentence per line, no numbering.',
        'Current-day vocabulary:',
        currentDayBlock || '- none',
        '',
        'Previous-day vocabulary to mix naturally when useful:',
        previousDaysBlock || '- none',
      ].join('\n'),
    };
  }

  if (input.mode === 'dialogue') {
    return {
      systemPrompt: `You are an English tutor writing realistic conversational practice. ${commonRules}`,
      userPrompt: [
        `Current day: Day ${input.currentDayNumber}.`,
        'Generate a realistic dialogue of 10 to 14 lines in a daily-life situation.',
        'Use this strict format for every line: A: ... or B: ...',
        'Keep each line concise and natural.',
        'Current-day vocabulary:',
        currentDayBlock || '- none',
        '',
        'Previous-day vocabulary to mix naturally when useful:',
        previousDaysBlock || '- none',
      ].join('\n'),
    };
  }

  return {
    systemPrompt: `You are an English writing coach for vocabulary learners. ${commonRules}`,
    userPrompt: [
      `Current day: Day ${input.currentDayNumber}.`,
      'Create a practical writing brief for the learner.',
      'Output in this format:',
      'Topic: ...',
      'Situation: ...',
      'Goal: ...',
      'Suggested vocabulary: comma-separated words',
      'Starter 1: ...',
      'Starter 2: ...',
      'Starter 3: ...',
      'Current-day vocabulary:',
      currentDayBlock || '- none',
      '',
      'Previous-day vocabulary to mix naturally when useful:',
      previousDaysBlock || '- none',
    ].join('\n'),
  };
}

export function extractUsedWords(
  text: string,
  words: PracticeVocabularyWord[]
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
