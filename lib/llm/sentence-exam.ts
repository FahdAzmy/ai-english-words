export type SentenceExamMode = 'single' | 'batch';

export interface SentenceExamInputItem {
  word: string;
  definition?: string;
  sentence: string;
}

export interface SentenceExamRequest {
  mode: SentenceExamMode;
  dayId?: string;
  currentDayNumber?: number;
  sentences: SentenceExamInputItem[];
}

export interface SentenceExamItem {
  word: string;
  sentence: string;
  score: number;
  isWordUsed: boolean;
  feedback: string;
  betterSentence: string;
  weakPoints: string[];
}

export interface SentenceExamOverall {
  generalFeedback: string;
  repeatedWeakPoints: string[];
  nextSteps: string[];
}

export interface SentenceExamResponse {
  mode: SentenceExamMode;
  provider: string;
  model: string;
  results: SentenceExamItem[];
  overall: SentenceExamOverall;
}

export function buildSentenceExamPrompts(input: SentenceExamRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const section = input.sentences
    .map((item, index) => {
      const definitionLine = item.definition?.trim()
        ? `Definition: ${item.definition.trim()}`
        : 'Definition: not provided';

      return [
        `Item ${index + 1}:`,
        `Target word: ${item.word}`,
        definitionLine,
        `Learner sentence: ${item.sentence}`,
      ].join('\n');
    })
    .join('\n\n');

  const modeInstruction =
    input.mode === 'single'
      ? 'Review one learner sentence.'
      : 'Review every learner sentence, then provide combined guidance about repeated weak points.';

  return {
    systemPrompt: [
      'You are an English writing coach for vocabulary practice.',
      'Be supportive, specific, and practical.',
      'Return valid JSON only, with no markdown and no extra text.',
      'Scoring: 0-100.',
      'For each sentence, check if the target word is used naturally, grammar clarity, punctuation, and sentence completeness.',
      modeInstruction,
    ].join(' '),
    userPrompt: [
      `Mode: ${input.mode}`,
      input.currentDayNumber
        ? `Day number: ${input.currentDayNumber}`
        : 'Day number: not provided',
      `Day id: ${input.dayId || 'unknown_day'}`,
      '',
      'Output JSON schema:',
      '{',
      '  "results": [',
      '    {',
      '      "word": "string",',
      '      "sentence": "string",',
      '      "score": 0,',
      '      "isWordUsed": true,',
      '      "feedback": "short paragraph",',
      '      "betterSentence": "improved sentence",',
      '      "weakPoints": ["string"]',
      '    }',
      '  ],',
      '  "overall": {',
      '    "generalFeedback": "short paragraph",',
      '    "repeatedWeakPoints": ["string"],',
      '    "nextSteps": ["string"]',
      '  }',
      '}',
      '',
      'Sentences to review:',
      section,
    ].join('\n'),
  };
}
