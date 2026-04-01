import { getCurrentUser, getDayWords, getUserDays } from '@/lib/db/mock';
import { type Day, type Word } from '@/lib/types';
import { selectWordPool } from '@/lib/services/word-pool';

export interface PracticeWordEntry {
  word: Word;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export interface PracticeWordContext {
  currentDayNumber: number;
  entries: PracticeWordEntry[];
  words: Word[];
}

export async function buildPracticeWordContext(
  dayId: string,
  options?: { previousWordsPerDay?: number }
): Promise<PracticeWordContext> {
  const dayNumberFromId = parseDayNumber(dayId) ?? 1;
  const previousWordsPerDay = options?.previousWordsPerDay ?? 5;

  const dayWords = await getDayWords(dayId);
  const currentUser = await getCurrentUser();
  const userDays = currentUser ? await getUserDays(currentUser.id) : [];
  const currentDay = resolveCurrentDay(userDays, dayId, dayNumberFromId);
  const currentDayNumber = currentDay?.day_number || dayNumberFromId;

  const currentEntries: PracticeWordEntry[] = dayWords.map((word) => ({
    word,
    sourceDayNumber: currentDayNumber,
    isCurrentDay: true,
  }));

  const previousEntries = await buildPreviousDayEntries(
    userDays,
    currentDayNumber,
    previousWordsPerDay
  );

  const entries = dedupeEntriesByWord([...currentEntries, ...previousEntries]);

  return {
    currentDayNumber,
    entries,
    words: entries.map((entry) => entry.word),
  };
}

function parseDayNumber(dayId: string): number | null {
  const matched = dayId.match(/day_(\d+)/);
  return matched ? Number(matched[1]) : null;
}

function resolveCurrentDay(
  userDays: Day[],
  dayId: string,
  dayNumberFromId: number
): Day | null {
  const fromId = userDays.find((day) => day.id === dayId);
  if (fromId) return fromId;
  return userDays.find((day) => day.day_number === dayNumberFromId) || null;
}

async function buildPreviousDayEntries(
  userDays: Day[],
  currentDayNumber: number,
  previousWordsPerDay: number
): Promise<PracticeWordEntry[]> {
  const previousDays = userDays
    .filter((day) => day.day_number < currentDayNumber)
    .sort((a, b) => a.day_number - b.day_number);

  const entriesByDay = await Promise.all(
    previousDays.map(async (day) => {
      const words = await getDayWords(day.id);
      const selected = selectWordPool(words, Math.min(previousWordsPerDay, words.length));
      return selected.map((word) => ({
        word,
        sourceDayNumber: day.day_number,
        isCurrentDay: false,
      }));
    })
  );

  return entriesByDay.flat();
}

function dedupeEntriesByWord(entries: PracticeWordEntry[]): PracticeWordEntry[] {
  const seen = new Set<string>();
  const unique: PracticeWordEntry[] = [];

  for (const entry of entries) {
    const key = entry.word.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  return unique;
}
