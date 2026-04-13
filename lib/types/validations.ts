import { z } from 'zod';

// Story Genre and Difficulty Validation
export const StoryGenreSchema = z.enum(['mystery', 'comedy', 'business', 'travel', 'daily-life']);
export const DifficultyLevelSchema = z.enum(['A2', 'B1', 'B2', 'C1']);

// Comprehension Question Validation
export const ComprehensionQuestionSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  answer: z.string().min(1, 'Answer cannot be empty'),
  type: z.literal('short-answer'),
});

// Story Validation
export const StorySchema = z.object({
  id: z.string(),
  day_id: z.string(),
  genre: StoryGenreSchema,
  difficulty: DifficultyLevelSchema,
  story_text: z.string().min(1, 'Story text cannot be empty'),
  comprehension_questions: z
    .array(ComprehensionQuestionSchema)
    .min(3, 'Must have at least 3 questions')
    .max(5, 'Must have at most 5 questions'),
  words_requested: z.array(z.string()),
  words_used: z.array(z.string()),
  provider: z.string(),
  model: z.string(),
  created_at: z.string(),
});

// Context Tag Validation
export const ContextTagSchema = z.enum([
  'restaurant',
  'office',
  'travel',
  'shopping',
  'healthcare',
  'education',
  'social',
  'transport',
  'home',
  'general',
]);

// Sentence Favorite Validation
export const SentenceFavoriteSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  sentence_text: z.string().min(1, 'Sentence text cannot be empty'),
  words_used: z.array(z.string()),
  context_tag: ContextTagSchema,
  created_at: z.string(),
});

// Sentence Variation Validation
export const SentenceVariationSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  original_sentence_id: z.string(),
  variation_text: z.string().min(1, 'Variation text cannot be empty'),
  words_used: z.array(z.string()),
  created_at: z.string(),
});

// Cloze Exercise Validation
export const ClozeExerciseSchema = z.object({
  original_sentence: z.string(),
  cloze_sentence: z.string(),
  target_word: z.string(),
  user_answer: z.string(),
  is_correct: z.boolean(),
  feedback: z.string(),
});

// Cloze Session Validation
export const ClozeSessionSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  exercises: z.array(ClozeExerciseSchema).min(1, 'Must have at least 1 exercise'),
  total_correct: z.number().int().min(0),
  total_attempted: z.number().int().min(0),
  score_percent: z.number().min(0).max(100),
  created_at: z.string(),
});

// Sentence Attempt Validation
export const SentenceAttemptSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  target_word: z.string(),
  submitted_sentence: z.string().min(1, 'Sentence cannot be empty'),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  better_sentence: z.string(),
  weak_points: z.array(z.string()),
  is_word_used: z.boolean(),
  is_retry: z.boolean(),
  retry_count: z.number().int().min(0),
  previous_attempt_id: z.string(),
  created_at: z.string(),
});

// Timed Sentence Validation
export const TimedSentenceSchema = z.object({
  target_word: z.string(),
  submitted_sentence: z.string(),
  score: z.number().min(0).max(100),
  submitted_at: z.number().min(0),
});

// Timed Challenge Validation
export const TimedChallengeSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  duration_seconds: z.number().int().min(1),
  time_used_seconds: z.number().int().min(0),
  sentences: z.array(TimedSentenceSchema),
  sentences_completed: z.number().int().min(0),
  average_score: z.number().min(0).max(100),
  created_at: z.string(),
});

// Dialogue Enums
export const DialogueRoleSchema = z.enum(['A', 'B']);
export const DialogueScenarioSchema = z.enum([
  'airport',
  'restaurant',
  'job-interview',
  'shopping',
  'doctor',
  'hotel',
  'social-event',
  'general',
]);
export const DialogueDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

// Dialogue Turn Validation
export const DialogueTurnSchema = z.object({
  turn_number: z.number().int().min(1),
  speaker: z.enum(['AI', 'User']),
  character: z.enum(['A', 'B']),
  text: z.string(),
  response_options: z.array(z.string()).optional(),
  user_selected_option: z.number().optional(),
  is_voice_input: z.boolean(),
  transcription_confidence: z.number().min(0).max(1).optional(),
});

// Dialogue Session Validation
export const DialogueSessionSchema = z.object({
  id: z.string(),
  day_id: z.string(),
  user_role: DialogueRoleSchema,
  scenario: DialogueScenarioSchema,
  difficulty: DialogueDifficultySchema,
  turns: z.array(DialogueTurnSchema).min(1, 'Must have at least 1 turn'),
  words_used: z.array(z.string()),
  created_at: z.string(),
});

// Input Validation Schemas (for API route inputs)
export const GenerateStoryInputSchema = z.object({
  dayId: z.string(),
  currentDayNumber: z.number().int().min(1),
  words: z.array(
    z.object({
      word: z.string(),
      definition: z.string(),
      sourceDayNumber: z.number(),
      isCurrentDay: z.boolean(),
    })
  ),
  genre: StoryGenreSchema.optional(),
  difficulty: DifficultyLevelSchema.optional(),
});

export const SentenceExamInputSchema = z.object({
  mode: z.enum(['single', 'batch']),
  dayId: z.string().optional(),
  currentDayNumber: z.number().optional(),
  sentences: z.array(
    z.object({
      word: z.string(),
      definition: z.string().optional(),
      sentence: z.string(),
    })
  ),
  includeHint: z.boolean().optional(),
});

// Type exports
export type StoryGenre = z.infer<typeof StoryGenreSchema>;
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type ContextTag = z.infer<typeof ContextTagSchema>;
export type DialogueRole = z.infer<typeof DialogueRoleSchema>;
export type DialogueScenario = z.infer<typeof DialogueScenarioSchema>;
export type DialogueDifficulty = z.infer<typeof DialogueDifficultySchema>;
