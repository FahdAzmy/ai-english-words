import { Word } from '@/lib/types';

export function selectWordPool(allWords: Word[], totalWords: number = 5): Word[] {
  if (allWords.length === 0) return [];

  // Sort words: prioritize by frequency of use, then by least recently used
  const sorted = [...allWords].sort((a, b) => {
    const aUsedScore = a.times_used - (a.last_used_at ? 0 : 10); // Penalize unused words
    const bUsedScore = b.times_used - (b.last_used_at ? 0 : 10);

    // If equal usage, prefer least recently used
    if (aUsedScore === bUsedScore) {
      const aLastUsed = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
      const bLastUsed = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
      return aLastUsed - bLastUsed;
    }

    return aUsedScore - bUsedScore;
  });

  // Strategy: 30-50% should be previously learned words
  const reviewPercentage = Math.random() * 0.2 + 0.3; // 30-50%
  const reviewCount = Math.max(1, Math.floor(totalWords * reviewPercentage));
  const newCount = totalWords - reviewCount;

  // Get review words (words already used)
  const previouslyUsed = sorted.filter((w) => w.times_used > 0);
  const reviewWords = previouslyUsed.slice(0, reviewCount);

  // Get new words (words not used or least used)
  const newWords = sorted
    .filter((w) => !reviewWords.includes(w))
    .slice(0, newCount);

  // Combine and shuffle
  const selected = [...reviewWords, ...newWords];
  return shuffleArray(selected);
}

export function groupWordsByDifficulty(words: Word[]): {
  easy: Word[];
  medium: Word[];
  hard: Word[];
} {
  const easy = words.filter((w) => w.times_used >= 2);
  const hard = words.filter((w) => w.times_used === 0);
  const medium = words.filter((w) => w.times_used === 1);

  return { easy, medium, hard };
}

export function getSuggestedPracticeMode(words: Word[]): 'story' | 'sentences' | 'dialogue' | 'writing' {
  const avgUsage = words.reduce((sum, w) => sum + w.times_used, 0) / words.length;

  // Suggest different modes based on familiarity
  if (avgUsage < 1) {
    return 'story'; // New words - easier with example
  } else if (avgUsage < 2) {
    return 'sentences'; // Some familiarity
  } else if (avgUsage < 3) {
    return 'dialogue'; // More advanced
  } else {
    return 'writing'; // Most challenging
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getProgressStats(words: Word[]): {
  totalWords: number;
  learned: number;
  learning: number;
  new: number;
  masteredPercentage: number;
} {
  const learned = words.filter((w) => w.times_used >= 3).length;
  const learning = words.filter((w) => w.times_used >= 1 && w.times_used < 3).length;
  const newWords = words.filter((w) => w.times_used === 0).length;

  return {
    totalWords: words.length,
    learned,
    learning,
    new: newWords,
    masteredPercentage: words.length > 0 ? Math.round((learned / words.length) * 100) : 0,
  };
}
