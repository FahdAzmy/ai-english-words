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
  type: 'story' | 'sentences' | 'dialogue' | 'writing' | 'music';
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
