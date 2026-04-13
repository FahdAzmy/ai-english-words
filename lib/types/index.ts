// Database Types

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Day {
  id: string;
  user_id: string;
  day_number: number;
  created_at: string;
  updated_at: string;
}

export interface Word {
  id: string;
  day_id: string;
  word: string;
  definition: string;
  example_sentence?: string | null;
  times_used: number;
  last_used_at: string | null;
  created_at: string;
}

export interface Practice {
  id: string;
  day_id: string;
  type: "story" | "sentences" | "dialogue" | "writing" | "music" | "speaking";
  response: string;
  words_used: string[];
  created_at: string;
}

export interface Music {
  id: string;
  day_id: string;
  lyrics: string;
  words_used: string[];
  provider: string | null;
  model: string | null;
  created_at: string;
}

export interface SpeakingAttempt {
  id: string;
  day_id: string;
  transcript: string;
  duration_seconds: number | null;
  words_used: string[];
  required_words: string[];
  coverage_percent: number;
  words_per_minute: number | null;
  feedback: string;
  created_at: string;
}

export interface WordPool {
  words: Word[];
  distribution: {
    newWords: Word[];
    reviewWords: Word[];
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PracticeResponse {
  success: boolean;
  feedback?: string;
  score?: number;
  wordsHighlighted?: string[];
  error?: string;
}

// Practice Enhancement Types

export type StoryGenre =
  | "mystery"
  | "comedy"
  | "business"
  | "travel"
  | "daily-life";
export type DifficultyLevel = "A2" | "B1" | "B2" | "C1";

export interface ComprehensionQuestion {
  question: string;
  answer: string;
  type: "short-answer";
}

export interface Story {
  id: string;
  day_id: string;
  genre: StoryGenre;
  difficulty: DifficultyLevel;
  story_text: string;
  comprehension_questions: ComprehensionQuestion[];
  words_requested: string[];
  words_used: string[];
  provider: string;
  model: string;
  created_at: string;
}

export type ContextTag =
  | "restaurant"
  | "office"
  | "travel"
  | "shopping"
  | "healthcare"
  | "education"
  | "social"
  | "transport"
  | "home"
  | "general";

export interface SentenceFavorite {
  id: string;
  day_id: string;
  sentence_text: string;
  words_used: string[];
  context_tag: ContextTag;
  created_at: string;
}

export interface SentenceVariation {
  id: string;
  day_id: string;
  original_sentence_id: string;
  variation_text: string;
  words_used: string[];
  created_at: string;
}

export interface ClozeExercise {
  original_sentence: string;
  cloze_sentence: string;
  target_word: string;
  user_answer: string;
  is_correct: boolean;
  feedback: string;
}

export interface ClozeSession {
  id: string;
  day_id: string;
  exercises: ClozeExercise[];
  total_correct: number;
  total_attempted: number;
  score_percent: number;
  created_at: string;
}

export interface SentenceAttempt {
  id: string;
  day_id: string;
  target_word: string;
  submitted_sentence: string;
  score: number;
  feedback: string;
  better_sentence: string;
  weak_points: string[];
  is_word_used: boolean;
  is_retry: boolean;
  retry_count: number;
  previous_attempt_id: string;
  created_at: string;
}

export interface TimedSentence {
  target_word: string;
  submitted_sentence: string;
  score: number;
  submitted_at: number;
}

export interface TimedChallenge {
  id: string;
  day_id: string;
  duration_seconds: number;
  time_used_seconds: number;
  sentences: TimedSentence[];
  sentences_completed: number;
  average_score: number;
  created_at: string;
}

export type DialogueRole = "A" | "B";
export type DialogueScenario =
  | "airport"
  | "restaurant"
  | "job-interview"
  | "shopping"
  | "doctor"
  | "hotel"
  | "social-event"
  | "general";
export type DialogueDifficulty = "beginner" | "intermediate" | "advanced";

export interface DialogueTurn {
  turn_number: number;
  speaker: "AI" | "User";
  character: "A" | "B";
  text: string;
  response_options?: string[];
  user_selected_option?: number;
  is_voice_input: boolean;
  transcription_confidence?: number;
}

export interface DialogueSession {
  id: string;
  day_id: string;
  user_role: DialogueRole;
  scenario: DialogueScenario;
  difficulty: DialogueDifficulty;
  turns: DialogueTurn[];
  words_used: string[];
  created_at: string;
}
