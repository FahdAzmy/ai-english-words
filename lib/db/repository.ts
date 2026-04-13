import "server-only";
import { randomUUID } from "crypto";
import {
  type Day,
  type Music,
  type SpeakingAttempt,
  type User,
  type Word,
  type Story,
  type SentenceFavorite,
  type SentenceVariation,
  type ClozeSession,
  type SentenceAttempt,
  type TimedChallenge,
  type DialogueSession,
} from "@/lib/types";
import { getDb } from "@/lib/db/mongodb";

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

interface SpeakingAttemptDocument extends SpeakingAttempt {
  _id?: unknown;
}

interface StoryDocument extends Story {
  _id?: unknown;
}

interface SentenceFavoriteDocument extends SentenceFavorite {
  _id?: unknown;
}

interface SentenceVariationDocument extends SentenceVariation {
  _id?: unknown;
}

interface ClozeSessionDocument extends ClozeSession {
  _id?: unknown;
}

interface SentenceAttemptDocument extends SentenceAttempt {
  _id?: unknown;
}

interface TimedChallengeDocument extends TimedChallenge {
  _id?: unknown;
}

interface DialogueSessionDocument extends DialogueSession {
  _id?: unknown;
}

let indexesReady = false;

async function ensureIndexes() {
  if (indexesReady) return;

  const db = await getDb();
  await Promise.all([
    db
      .collection<UserDocument>("users")
      .createIndex({ id: 1 }, { unique: true }),
    db.collection<DayDocument>("days").createIndex({ id: 1 }, { unique: true }),
    db
      .collection<DayDocument>("days")
      .createIndex({ user_id: 1, day_number: 1 }),
    db
      .collection<WordDocument>("words")
      .createIndex({ id: 1 }, { unique: true }),
    db.collection<WordDocument>("words").createIndex({ day_id: 1 }),
    db
      .collection<MusicDocument>("music")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<MusicDocument>("music")
      .createIndex({ day_id: 1, created_at: -1 }),
    db
      .collection<SpeakingAttemptDocument>("speaking_attempts")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<SpeakingAttemptDocument>("speaking_attempts")
      .createIndex({ day_id: 1, created_at: -1 }),
    // New indexes for practice enhancement entities
    db
      .collection<StoryDocument>("stories")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<StoryDocument>("stories")
      .createIndex({ day_id: 1, created_at: -1 }),
    db
      .collection<SentenceFavoriteDocument>("sentence_favorites")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<SentenceFavoriteDocument>("sentence_favorites")
      .createIndex({ day_id: 1 }),
    db
      .collection<SentenceVariationDocument>("sentence_variations")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<SentenceVariationDocument>("sentence_variations")
      .createIndex({ day_id: 1 }),
    db
      .collection<SentenceVariationDocument>("sentence_variations")
      .createIndex({ original_sentence_id: 1 }),
    db
      .collection<ClozeSessionDocument>("cloze_sessions")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<ClozeSessionDocument>("cloze_sessions")
      .createIndex({ day_id: 1, created_at: -1 }),
    db
      .collection<SentenceAttemptDocument>("sentence_attempts")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<SentenceAttemptDocument>("sentence_attempts")
      .createIndex({ day_id: 1, target_word: 1, created_at: -1 }),
    db
      .collection<SentenceAttemptDocument>("sentence_attempts")
      .createIndex({ previous_attempt_id: 1 }),
    db
      .collection<TimedChallengeDocument>("timed_challenges")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<TimedChallengeDocument>("timed_challenges")
      .createIndex({ day_id: 1, created_at: -1 }),
    db
      .collection<DialogueSessionDocument>("dialogue_sessions")
      .createIndex({ id: 1 }, { unique: true }),
    db
      .collection<DialogueSessionDocument>("dialogue_sessions")
      .createIndex({ day_id: 1, created_at: -1 }),
  ]);

  indexesReady = true;
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(
  prefix:
    | "day"
    | "word"
    | "music"
    | "speaking"
    | "story"
    | "fav"
    | "var"
    | "cloze"
    | "attempt"
    | "timed"
    | "dialogue",
  dayNumber?: number,
): string {
  const ts = Date.now();
  const suffix = randomUUID().slice(0, 8);
  if (prefix === "day" && typeof dayNumber === "number") {
    return `day_${dayNumber}_${ts}_${suffix}`;
  }
  return `${prefix}_${ts}_${suffix}`;
}

export async function getCurrentUserRepo(): Promise<User | null> {
  await ensureIndexes();
  const db = await getDb();
  const users = db.collection<UserDocument>("users");

  const userId = process.env.DEFAULT_USER_ID || "user_1";
  const userEmail = process.env.DEFAULT_USER_EMAIL || "learner@example.com";

  await users.updateOne(
    { id: userId },
    {
      $setOnInsert: {
        id: userId,
        email: userEmail,
        created_at: nowIso(),
      },
    },
    { upsert: true },
  );

  const user = await users.findOne({ id: userId }, { projection: { _id: 0 } });
  return user || null;
}

export async function getUserDaysRepo(userId: string): Promise<Day[]> {
  await ensureIndexes();
  const db = await getDb();
  const days = await db
    .collection<DayDocument>("days")
    .find({ user_id: userId }, { projection: { _id: 0 } })
    .sort({ day_number: 1 })
    .toArray();

  return days;
}

export async function getUserWordsCountRepo(userId: string): Promise<number> {
  await ensureIndexes();
  const db = await getDb();

  const dayIds = (
    await db
      .collection<DayDocument>("days")
      .find({ user_id: userId }, { projection: { _id: 0, id: 1 } })
      .toArray()
  ).map((day) => day.id);

  if (dayIds.length === 0) {
    return 0;
  }

  const totalWords = await db
    .collection<WordDocument>("words")
    .countDocuments({ day_id: { $in: dayIds } });

  return totalWords;
}

export async function getDayWordsRepo(dayId: string): Promise<Word[]> {
  await ensureIndexes();
  const db = await getDb();
  const words = await db
    .collection<WordDocument>("words")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();

  return words;
}

export async function createDayRepo(
  userId: string,
  dayNumber: number,
): Promise<Day> {
  await ensureIndexes();
  const db = await getDb();
  const daysCollection = db.collection<DayDocument>("days");

  const day: Day = {
    id: generateId("day", dayNumber),
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
  exampleSentence?: string,
): Promise<Word> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>("words");
  const daysCollection = db.collection<DayDocument>("days");

  const newWord: Word = {
    id: generateId("word"),
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
    { $set: { updated_at: nowIso() } },
  );

  return newWord;
}

export async function updateWordRepo(
  wordId: string,
  word: string,
  definition: string,
  exampleSentence?: string,
): Promise<Word | null> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>("words");
  const daysCollection = db.collection<DayDocument>("days");

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } },
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
    },
  );

  await daysCollection.updateOne(
    { id: current.day_id },
    { $set: { updated_at: nowIso() } },
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
  const wordsCollection = db.collection<WordDocument>("words");
  const daysCollection = db.collection<DayDocument>("days");

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } },
  );

  if (!current) return false;

  const result = await wordsCollection.deleteOne({ id: wordId });

  if (result.deletedCount > 0) {
    await daysCollection.updateOne(
      { id: current.day_id },
      { $set: { updated_at: nowIso() } },
    );
    return true;
  }

  return false;
}

export async function updateWordUsageRepo(
  wordId: string,
): Promise<Word | null> {
  await ensureIndexes();
  const db = await getDb();
  const wordsCollection = db.collection<WordDocument>("words");

  const current = await wordsCollection.findOne(
    { id: wordId },
    { projection: { _id: 0 } },
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
    },
  );

  return {
    ...current,
    times_used: nextUsage,
    last_used_at: nextLastUsed,
  };
}

export async function getLatestDayMusicRepo(
  dayId: string,
): Promise<Music | null> {
  await ensureIndexes();
  const db = await getDb();

  const music = await db
    .collection<MusicDocument>("music")
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
  model?: string,
): Promise<Music> {
  await ensureIndexes();
  const db = await getDb();
  const musicCollection = db.collection<MusicDocument>("music");

  const music: Music = {
    id: generateId("music"),
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

export async function getLatestSpeakingAttemptRepo(
  dayId: string,
): Promise<SpeakingAttempt | null> {
  await ensureIndexes();
  const db = await getDb();

  const attempts = await db
    .collection<SpeakingAttemptDocument>("speaking_attempts")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();

  return attempts[0] || null;
}

export async function createSpeakingAttemptRepo(
  dayId: string,
  transcript: string,
  wordsUsed: string[],
  requiredWords: string[],
  coveragePercent: number,
  feedback: string,
  durationSeconds?: number | null,
  wordsPerMinute?: number | null,
): Promise<SpeakingAttempt> {
  await ensureIndexes();
  const db = await getDb();
  const attemptsCollection =
    db.collection<SpeakingAttemptDocument>("speaking_attempts");

  const attempt: SpeakingAttempt = {
    id: generateId("speaking"),
    day_id: dayId,
    transcript,
    duration_seconds:
      typeof durationSeconds === "number" ? durationSeconds : null,
    words_used: wordsUsed,
    required_words: requiredWords,
    coverage_percent: Number.isFinite(coveragePercent) ? coveragePercent : 0,
    words_per_minute:
      typeof wordsPerMinute === "number" ? wordsPerMinute : null,
    feedback,
    created_at: nowIso(),
  };

  await attemptsCollection.insertOne(attempt);
  return attempt;
}

// ==========================================
// Practice Enhancement Repository Methods
// ==========================================

// Story Repository Methods
export async function createStoryRepo(
  dayId: string,
  genre: Story["genre"],
  difficulty: Story["difficulty"],
  storyText: string,
  comprehensionQuestions: Story["comprehension_questions"],
  wordsRequested: string[],
  wordsUsed: string[],
  provider: string,
  model: string,
): Promise<Story> {
  await ensureIndexes();
  const db = await getDb();
  const storiesCollection = db.collection<StoryDocument>("stories");

  const story: Story = {
    id: generateId("story" as any),
    day_id: dayId,
    genre,
    difficulty,
    story_text: storyText,
    comprehension_questions: comprehensionQuestions,
    words_requested: wordsRequested,
    words_used: wordsUsed,
    provider,
    model,
    created_at: nowIso(),
  };

  await storiesCollection.insertOne(story);
  return story;
}

export async function getDayStoriesRepo(dayId: string): Promise<Story[]> {
  await ensureIndexes();
  const db = await getDb();
  const stories = await db
    .collection<StoryDocument>("stories")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return stories;
}

export async function getStoryByIdRepo(storyId: string): Promise<Story | null> {
  await ensureIndexes();
  const db = await getDb();
  const story = await db
    .collection<StoryDocument>("stories")
    .findOne({ id: storyId }, { projection: { _id: 0 } });

  return story || null;
}

// Sentence Favorite Repository Methods
export async function createFavoriteRepo(
  dayId: string,
  sentenceText: string,
  wordsUsed: string[],
  contextTag: SentenceFavorite["context_tag"],
): Promise<SentenceFavorite> {
  await ensureIndexes();
  const db = await getDb();
  const favoritesCollection =
    db.collection<SentenceFavoriteDocument>("sentence_favorites");

  const favorite: SentenceFavorite = {
    id: generateId("fav" as any),
    day_id: dayId,
    sentence_text: sentenceText,
    words_used: wordsUsed,
    context_tag: contextTag,
    created_at: nowIso(),
  };

  await favoritesCollection.insertOne(favorite);
  return favorite;
}

export async function getDayFavoritesRepo(
  dayId: string,
): Promise<SentenceFavorite[]> {
  await ensureIndexes();
  const db = await getDb();
  const favorites = await db
    .collection<SentenceFavoriteDocument>("sentence_favorites")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();

  return favorites;
}

export async function deleteFavoriteRepo(favoriteId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const result = await db
    .collection<SentenceFavoriteDocument>("sentence_favorites")
    .deleteOne({ id: favoriteId });

  return result.deletedCount > 0;
}

// Sentence Variation Repository Methods
export async function createVariationRepo(
  dayId: string,
  originalSentenceId: string,
  variationText: string,
  wordsUsed: string[],
): Promise<SentenceVariation> {
  await ensureIndexes();
  const db = await getDb();
  const variationsCollection = db.collection<SentenceVariationDocument>(
    "sentence_variations",
  );

  const variation: SentenceVariation = {
    id: generateId("var" as any),
    day_id: dayId,
    original_sentence_id: originalSentenceId,
    variation_text: variationText,
    words_used: wordsUsed,
    created_at: nowIso(),
  };

  await variationsCollection.insertOne(variation);
  return variation;
}

export async function getDayVariationsRepo(
  dayId: string,
): Promise<SentenceVariation[]> {
  await ensureIndexes();
  const db = await getDb();
  const variations = await db
    .collection<SentenceVariationDocument>("sentence_variations")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();

  return variations;
}

// Cloze Session Repository Methods
export async function createClozeSessionRepo(
  dayId: string,
  exercises: ClozeSession["exercises"],
): Promise<ClozeSession> {
  await ensureIndexes();
  const db = await getDb();
  const sessionsCollection =
    db.collection<ClozeSessionDocument>("cloze_sessions");

  const totalCorrect = exercises.filter((e) => e.is_correct).length;
  const totalAttempted = exercises.length;
  const scorePercent =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  const session: ClozeSession = {
    id: generateId("cloze" as any),
    day_id: dayId,
    exercises,
    total_correct: totalCorrect,
    total_attempted: totalAttempted,
    score_percent: scorePercent,
    created_at: nowIso(),
  };

  await sessionsCollection.insertOne(session);
  return session;
}

export async function getDayClozeSessionsRepo(
  dayId: string,
): Promise<ClozeSession[]> {
  await ensureIndexes();
  const db = await getDb();
  const sessions = await db
    .collection<ClozeSessionDocument>("cloze_sessions")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return sessions;
}

// Sentence Attempt Repository Methods
export async function createSentenceAttemptRepo(
  dayId: string,
  targetWord: string,
  submittedSentence: string,
  score: number,
  feedback: string,
  betterSentence: string,
  weakPoints: string[],
  isWordUsed: boolean,
  isRetry: boolean,
  retryCount: number,
  previousAttemptId: string,
): Promise<SentenceAttempt> {
  await ensureIndexes();
  const db = await getDb();
  const attemptsCollection =
    db.collection<SentenceAttemptDocument>("sentence_attempts");

  const attempt: SentenceAttempt = {
    id: generateId("attempt" as any),
    day_id: dayId,
    target_word: targetWord,
    submitted_sentence: submittedSentence,
    score,
    feedback,
    better_sentence: betterSentence,
    weak_points: weakPoints,
    is_word_used: isWordUsed,
    is_retry: isRetry,
    retry_count: retryCount,
    previous_attempt_id: previousAttemptId,
    created_at: nowIso(),
  };

  await attemptsCollection.insertOne(attempt);
  return attempt;
}

export async function getWordSentenceAttemptsRepo(
  dayId: string,
  targetWord: string,
): Promise<SentenceAttempt[]> {
  await ensureIndexes();
  const db = await getDb();
  const attempts = await db
    .collection<SentenceAttemptDocument>("sentence_attempts")
    .find(
      { day_id: dayId, target_word: targetWord },
      { projection: { _id: 0 } },
    )
    .sort({ created_at: 1 })
    .toArray();

  return attempts;
}

// Timed Challenge Repository Methods
export async function createTimedChallengeRepo(
  dayId: string,
  durationSeconds: number,
  timeUsedSeconds: number,
  sentences: TimedChallenge["sentences"],
  sentencesCompleted: number,
  averageScore: number,
): Promise<TimedChallenge> {
  await ensureIndexes();
  const db = await getDb();
  const challengesCollection =
    db.collection<TimedChallengeDocument>("timed_challenges");

  const challenge: TimedChallenge = {
    id: generateId("timed" as any),
    day_id: dayId,
    duration_seconds: durationSeconds,
    time_used_seconds: timeUsedSeconds,
    sentences,
    sentences_completed: sentencesCompleted,
    average_score: averageScore,
    created_at: nowIso(),
  };

  await challengesCollection.insertOne(challenge);
  return challenge;
}

export async function getDayTimedChallengesRepo(
  dayId: string,
): Promise<TimedChallenge[]> {
  await ensureIndexes();
  const db = await getDb();
  const challenges = await db
    .collection<TimedChallengeDocument>("timed_challenges")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return challenges;
}

// Dialogue Session Repository Methods
export async function createDialogueSessionRepo(
  dayId: string,
  userRole: DialogueSession["user_role"],
  scenario: DialogueSession["scenario"],
  difficulty: DialogueSession["difficulty"],
  turns: DialogueSession["turns"],
  wordsUsed: string[],
): Promise<DialogueSession> {
  await ensureIndexes();
  const db = await getDb();
  const sessionsCollection =
    db.collection<DialogueSessionDocument>("dialogue_sessions");

  const session: DialogueSession = {
    id: generateId("dialogue" as any),
    day_id: dayId,
    user_role: userRole,
    scenario,
    difficulty,
    turns,
    words_used: wordsUsed,
    created_at: nowIso(),
  };

  await sessionsCollection.insertOne(session);
  return session;
}

export async function getDayDialogueSessionsRepo(
  dayId: string,
): Promise<DialogueSession[]> {
  await ensureIndexes();
  const db = await getDb();
  const sessions = await db
    .collection<DialogueSessionDocument>("dialogue_sessions")
    .find({ day_id: dayId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .toArray();

  return sessions;
}
