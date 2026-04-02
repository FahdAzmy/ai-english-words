import 'server-only';
import { randomUUID } from 'crypto';
import { type Day, type Music, type User, type Word } from '@/lib/types';
import { getDb } from '@/lib/db/mongodb';

interface UserDocument extends User {
  _id?: unknown;
}

interface DayDocument extends Day {
  _id?: unknown;
}

interface WordDocument extends Word {
  _id?: unknown;
}

interface MusicDocument extends Music {
  _id?: unknown;
}

let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) return;

  const db = await getDb();
  await Promise.all([
    db.collection<UserDocument>('users').createIndex({ id: 1 }, { unique: true }),
    db.collection<DayDocument>('days').createIndex({ id: 1 }, { unique: true }),
    db.collection<DayDocument>('days').createIndex({ user_id: 1, day_number: 1 }),
    db.collection<WordDocument>('words').createIndex({ id: 1 }, { unique: true }),
    db.collection<WordDocument>('words').createIndex({ day_id: 1 }),
    db.collection<MusicDocument>('music').createIndex({ id: 1 }, { unique: true }),
    db.collection<MusicDocument>('music').createIndex({ day_id: 1, created_at: -1 }),
  ]);

  indexesReady = true;
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: 'day' | 'word' | 'music', dayNumber?: number): string {
  const ts = Date.now();
  const suffix = randomUUID().slice(0, 8);
  if (prefix === 'day' && typeof dayNumber === 'number') {
    return `day_${dayNumber}_${ts}_${suffix}`;
  }
  return `${prefix}_${ts}_${suffix}`;
}

export async function getCurrentUserRepo(): Promise<User | null> {
  await ensureIndexes();
  const db = await getDb();
  const users = db.collection<UserDocument>('users');

  const userId = process.env.DEFAULT_USER_ID || 'user_1';
  const userEmail = process.env.DEFAULT_USER_EMAIL || 'learner@example.com';

  await users.updateOne(
    { id: userId },
    {
      $setOnInsert: {
        id: userId,
        email: userEmail,
        created_at: nowIso(),
      },
    },
    { upsert: true }
  );

  const user = await users.findOne({ id: userId }, { projection: { _id: 0 } });
  return user || null;
}

export async function getUserDaysRepo(userId: string): Promise<Day[]> {
  await ensureIndexes();
  const db = await getDb();
  const days = await db
    .collection<DayDocument>('days')
    .find({ user_id: userId }, { projection: { _id: 0 } })
    .sort({ day_number: 1 })
    .toArray();

  return days;
}

export async function getDayWordsRepo(dayId: string): Promise<Word[]> {
  await ensureIndexes();
  const db = await getDb();
  const words = await db
    .collection<WordDocument>('words')
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();

  return words;
}

export async function createDayRepo(userId: string, dayNumber: number): Promise<Day> {
  await ensureIndexes();
  const db = await getDb();
  const daysCollection = db.collection<DayDocument>('days');

  const day: Day = {
    id: generateId('day', dayNumber),
    user_id: userId,
    day_number: dayNumber,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await daysCollection.insertOne(day);
  return day;
}

export async function createWordRepo(
  dayId: string,
  word: string,
  definition: string,
  exampleSentence?: string
): Promise<Word> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>('words');
  const daysCollection = db.collection<DayDocument>('days');

  const newWord: Word = {
    id: generateId('word'),
    day_id: dayId,
    word,
    definition,
    example_sentence: exampleSentence?.trim() ? exampleSentence.trim() : null,
    times_used: 0,
    last_used_at: null,
    created_at: nowIso(),
  };

  await wordsCollection.insertOne(newWord);
  await daysCollection.updateOne(
    { id: dayId },
    { $set: { updated_at: nowIso() } }
  );

  return newWord;
}

export async function updateWordRepo(
  wordId: string,
  word: string,
  definition: string,
  exampleSentence?: string
): Promise<Word | null> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>('words');
  const daysCollection = db.collection<DayDocument>('days');

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } }
  );

  if (!current) return null;

  const nextSentence = exampleSentence?.trim() ? exampleSentence.trim() : null;

  await wordsCollection.updateOne(
    { id: wordId },
    {
      $set: {
        word,
        definition,
        example_sentence: nextSentence,
      },
    }
  );

  await daysCollection.updateOne(
    { id: current.day_id },
    { $set: { updated_at: nowIso() } }
  );

  return {
    ...current,
    word,
    definition,
    example_sentence: nextSentence,
  };
}

export async function deleteWordRepo(wordId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>('words');
  const daysCollection = db.collection<DayDocument>('days');

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } }
  );

  if (!current) return false;

  const result = await wordsCollection.deleteOne({ id: wordId });

  if (result.deletedCount > 0) {
    await daysCollection.updateOne(
      { id: current.day_id },
      { $set: { updated_at: nowIso() } }
    );
    return true;
  }

  return false;
}

export async function updateWordUsageRepo(wordId: string): Promise<Word | null> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>('words');

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } }
  );

  if (!current) return null;

  const nextUsage = (current.times_used || 0) + 1;
  const nextLastUsed = nowIso();

  await wordsCollection.updateOne(
    { id: wordId },
    {
      $set: {
        times_used: nextUsage,
        last_used_at: nextLastUsed,
      },
    }
  );

  return {
    ...current,
    times_used: nextUsage,
    last_used_at: nextLastUsed,
  };
}

export async function getLatestDayMusicRepo(dayId: string): Promise<Music | null> {
  await ensureIndexes();
  const db = await getDb();

  const music = await db
    .collection<MusicDocument>('music')
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();

  return music[0] || null;
}

export async function createDayMusicRepo(
  dayId: string,
  lyrics: string,
  wordsUsed: string[],
  provider?: string,
  model?: string
): Promise<Music> {
  await ensureIndexes();
  const db = await getDb();
  const musicCollection = db.collection<MusicDocument>('music');

  const music: Music = {
    id: generateId('music'),
    day_id: dayId,
    lyrics,
    words_used: wordsUsed,
    provider: provider?.trim() || null,
    model: model?.trim() || null,
    created_at: nowIso(),
  };

  await musicCollection.insertOne(music);
  return music;
}
