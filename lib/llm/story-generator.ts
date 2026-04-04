export interface StoryVocabularyWord {
  word: string;
  definition: string;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export interface GenerateStoryInput {
  dayId: string;
  currentDayNumber: number;
  words: StoryVocabularyWord[];
}

export interface GenerateStoryOutput {
  story: string;
  provider: string;
  model: string;
  wordsRequested: string[];
  wordsUsed: string[];
}

export function buildStoryPrompts(input: GenerateStoryInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const currentDayWords = input.words.filter((word) => word.isCurrentDay);
  const previousDayWords = input.words.filter((word) => !word.isCurrentDay);

  const currentDayBlock = currentDayWords
    .map((word) => `- ${word.word}: ${word.definition}`)
    .join('\n');

  const previousDaysBlock = previousDayWords
    .map(
      (word) =>
        `- Day ${word.sourceDayNumber} - ${word.word}: ${word.definition}`
    )
    .join('\n');

  const systemPrompt = [
    'You are an expert English vocabulary tutor.',
    'Write a coherent and engaging story for language learners.',
    'Use clear B1-B2 level English unless a listed word is advanced.',
    'Use every listed vocabulary word at least once, naturally in context.',
    'Do not skip any vocabulary word.',
    'Do not output markdown or lists; output plain story text only.',
  ].join(' ');

  const userPrompt = [
    `Current day: Day ${input.currentDayNumber}.`,
    'Generate one complete story with no fixed word-count limit.',
    'Vocabulary words from the current day (must all be included):',
    currentDayBlock || '- none',
    '',
    'Vocabulary words from previous days (5 from each previous day, include all provided words):',
    previousDaysBlock || '- none',
  ].join('\n');

  return { systemPrompt, userPrompt };
}

export function extractUsedWords(story: string, words: StoryVocabularyWord[]): string[] {
  const storyLower = story.toLowerCase();
  return words
    .map((word) => word.word)
    .filter((word) => storyLower.includes(word.toLowerCase()));
}
