/**
 * Word Highlighting Utility Tests (TDD: RED phase)
 * These tests should FAIL initially, then pass after implementation
 */
import { highlightWordsInText, type VocabularyWord } from '@/lib/utils/highlight-words';

describe('highlightWordsInText', () => {
  const words: VocabularyWord[] = [
    { word: 'ephemeral', definition: 'lasting for a very short time' },
    { word: 'ubiquitous', definition: 'present everywhere' },
  ];

  it('should wrap vocabulary words in highlight markup', () => {
    const text = 'The ephemeral nature of ubiquitous patterns is fascinating.';
    const result = highlightWordsInText(text, words);

    expect(result).toContain('ephemeral');
    expect(result).toContain('ubiquitous');
  });

  it('should handle case-insensitive matching', () => {
    const text = 'The Ephemeral patterns are UBIQUITOUS.';
    const result = highlightWordsInText(text, words);

    expect(result).toContain('Ephemeral');
    expect(result).toContain('UBIQUITOUS');
  });

  it('should include definition data in the highlight', () => {
    const text = 'The ephemeral patterns.';
    const result = highlightWordsInText(text, words);

    // Result should contain definition for tooltip
    expect(result).toContain('lasting for a very short time');
  });

  it('should handle special regex characters in words', () => {
    const specialWords: VocabularyWord[] = [
      { word: 'can\'t', definition: 'cannot' },
      { word: 'word-with-dashes', definition: 'hyphenated' },
    ];
    const text = "I can't believe the word-with-dashes is real.";

    expect(() => highlightWordsInText(text, specialWords)).not.toThrow();
  });

  it('should return text unchanged when no words match', () => {
    const text = 'No vocabulary words here at all.';
    const result = highlightWordsInText(text, words);

    expect(result).toContain('No vocabulary words here at all.');
  });

  it('should handle empty text', () => {
    const result = highlightWordsInText('', words);
    expect(result).toBe('');
  });

  it('should handle empty words array', () => {
    const text = 'Some text here.';
    const result = highlightWordsInText(text, []);
    expect(result).toBe(text);
  });
});
