import { Day, Music, SpeakingAttempt, User, Word } from '@/lib/types';

type DBAction =
  | 'getCurrentUser'
  | 'getUserDays'
  | 'getUserWordsCount'
  | 'getDayWords'
  | 'createDay'
  | 'createWord'
  | 'updateWord'
  | 'deleteWord'
  | 'updateWordUsage'
  | 'getDayMusic'
  | 'createDayMusic'
  | 'getSpeakingAttempt'
  | 'createSpeakingAttempt';

interface DBApiResponse<T> {
  data?: T;
  error?: string;
}

async function callDb<T>(action: DBAction, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  const json = (await response.json()) as DBApiResponse<T>;

  if (!response.ok) {
    throw new Error(json?.error || `Database request failed for action: ${action}`);
  }

  if (typeof json.data === 'undefined') {
    throw new Error(`Database response missing data for action: ${action}`);
  }

  return json.data;
}

export async function getCurrentUser(): Promise<User | null> {
  return callDb<User | null>('getCurrentUser');
}

export async function getUserDays(userId: string): Promise<Day[]> {
  return callDb<Day[]>('getUserDays', { userId });
}

export async function getUserWordsCount(userId: string): Promise<number> {
  return callDb<number>('getUserWordsCount', { userId });
}

export async function getDayWords(dayId: string): Promise<Word[]> {
  return callDb<Word[]>('getDayWords', { dayId });
}

export async function createDay(userId: string, dayNumber: number): Promise<Day> {
  return callDb<Day>('createDay', { userId, dayNumber });
}

export async function createWord(
  dayId: string,
  word: string,
  definition: string,
  sentence?: string
): Promise<Word> {
  return callDb<Word>('createWord', { dayId, word, definition, sentence });
}

export async function updateWord(
  wordId: string,
  word: string,
  definition: string,
  sentence?: string
): Promise<Word> {
  return callDb<Word>('updateWord', { wordId, word, definition, sentence });
}

export async function deleteWord(wordId: string): Promise<boolean> {
  return callDb<boolean>('deleteWord', { wordId });
}

export async function updateWordUsage(wordId: string): Promise<Word | null> {
  return callDb<Word | null>('updateWordUsage', { wordId });
}

export async function getDayMusic(dayId: string): Promise<Music | null> {
  return callDb<Music | null>('getDayMusic', { dayId });
}

export async function createDayMusic(
  dayId: string,
  lyrics: string,
  wordsUsed: string[],
  provider?: string,
  model?: string
): Promise<Music> {
  return callDb<Music>('createDayMusic', {
    dayId,
    lyrics,
    wordsUsed,
    provider,
    model,
  });
}

export async function getSpeakingAttempt(dayId: string): Promise<SpeakingAttempt | null> {
  return callDb<SpeakingAttempt | null>('getSpeakingAttempt', { dayId });
}

export async function createSpeakingAttempt(input: {
  dayId: string;
  transcript: string;
  wordsUsed: string[];
  requiredWords: string[];
  coveragePercent: number;
  feedback: string;
  durationSeconds?: number | null;
  wordsPerMinute?: number | null;
}): Promise<SpeakingAttempt> {
  return callDb<SpeakingAttempt>('createSpeakingAttempt', input);
}
