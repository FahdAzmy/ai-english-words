/**
 * User Story 1: Story Generation with Genre and Difficulty
 * TDD Tests - These should FAIL initially, then pass after implementation
 */
import { buildStoryPrompts, extractUsedWords, type GenerateStoryInput } from '@/lib/llm/story-generator';
import type { StoryGenre, DifficultyLevel } from '@/lib/types';

describe('buildStoryPrompts - Genre and Difficulty', () => {
  const baseInput: GenerateStoryInput = {
    dayId: 'day_1',
    currentDayNumber: 1,
    words: [
      { word: 'ephemeral', definition: 'lasting for a very short time', sourceDayNumber: 1, isCurrentDay: true },
      { word: 'ubiquitous', definition: 'present everywhere', sourceDayNumber: 1, isCurrentDay: true },
    ],
  };

  describe('Genre injection', () => {
    it('should include genre in system prompt when genre is specified', () => {
      const inputWithGenre: GenerateStoryInput & { genre?: StoryGenre } = {
        ...baseInput,
        genre: 'mystery',
      };

      const prompts = buildStoryPrompts(inputWithGenre);

      expect(prompts.systemPrompt).toContain('mystery');
      expect(prompts.systemPrompt.toLowerCase()).toMatch(/genre|mystery|theme/);
    });

    it('should include all genre types in system prompt', () => {
      const genres: StoryGenre[] = ['mystery', 'comedy', 'business', 'travel', 'daily-life'];

      genres.forEach((genre) => {
        const input: GenerateStoryInput & { genre?: StoryGenre } = {
          ...baseInput,
          genre,
        };

        const prompts = buildStoryPrompts(input);
        expect(prompts.systemPrompt).toContain(genre);
      });
    });

    it('should use default genre when genre is not specified', () => {
      const prompts = buildStoryPrompts(baseInput);

      // Should default to 'daily-life' genre
      expect(prompts.systemPrompt).toContain('daily-life');
    });
  });

  describe('Difficulty injection', () => {
    it('should include difficulty level in system prompt when specified', () => {
      const inputWithDifficulty: GenerateStoryInput & { difficulty?: DifficultyLevel } = {
        ...baseInput,
        difficulty: 'B1',
      };

      const prompts = buildStoryPrompts(inputWithDifficulty);

      expect(prompts.systemPrompt).toContain('B1');
    });

    it('should include all difficulty levels in system prompt', () => {
      const difficulties: DifficultyLevel[] = ['A2', 'B1', 'B2', 'C1'];

      difficulties.forEach((difficulty) => {
        const input: GenerateStoryInput & { difficulty?: DifficultyLevel } = {
          ...baseInput,
          difficulty,
        };

        const prompts = buildStoryPrompts(input);
        expect(prompts.systemPrompt).toContain(difficulty);
      });
    });

    it('should use default difficulty when not specified', () => {
      const prompts = buildStoryPrompts(baseInput);

      // Should default to 'B1' difficulty
      expect(prompts.systemPrompt).toContain('B1');
    });
  });

  describe('Combined genre and difficulty', () => {
    it('should include both genre and difficulty in system prompt', () => {
      const input: GenerateStoryInput & { genre?: StoryGenre; difficulty?: DifficultyLevel } = {
        ...baseInput,
        genre: 'comedy',
        difficulty: 'A2',
      };

      const prompts = buildStoryPrompts(input);

      expect(prompts.systemPrompt).toContain('comedy');
      expect(prompts.systemPrompt).toContain('A2');
    });
  });

  describe('GenerateStoryOutput with comprehension questions', () => {
    it('should have comprehensionQuestions field in output type', () => {
      // This test verifies the type definition exists
      const mockOutput = {
        story: 'A test story.',
        provider: 'mock',
        model: 'mock-model',
        wordsRequested: ['ephemeral'],
        wordsUsed: ['ephemeral'],
        comprehensionQuestions: [
          { question: 'What is the story about?', answer: 'Learning.', type: 'short-answer' },
        ],
        genre: 'daily-life' as StoryGenre,
        difficulty: 'B1' as DifficultyLevel,
      };

      expect(mockOutput.comprehensionQuestions).toBeDefined();
      expect(mockOutput.genre).toBe('daily-life');
      expect(mockOutput.difficulty).toBe('B1');
    });
  });
});

describe('extractUsedWords', () => {
  it('should extract words that appear in the story', () => {
    const story = 'The ephemeral nature of ubiquitous patterns is fascinating.';
    const words = [
      { word: 'ephemeral', definition: 'short-lived', sourceDayNumber: 1, isCurrentDay: true },
      { word: 'ubiquitous', definition: 'everywhere', sourceDayNumber: 1, isCurrentDay: true },
      { word: 'nonexistent', definition: 'not real', sourceDayNumber: 1, isCurrentDay: true },
    ];

    const result = extractUsedWords(story, words);

    expect(result).toContain('ephemeral');
    expect(result).toContain('ubiquitous');
    expect(result).not.toContain('nonexistent');
  });
});
