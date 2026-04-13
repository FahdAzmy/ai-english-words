/**
 * HighlightedWords Component Tests (US1)
 */
import { highlightWordsInText, parseHighlightedText } from '@/lib/utils/highlight-words';

describe('HighlightedWords Component Logic', () => {
  const words = [
    { word: 'ephemeral', definition: 'lasting for a very short time' },
    { word: 'ubiquitous', definition: 'present everywhere' },
  ];

  it('should wrap vocabulary words in highlight markup with definition', () => {
    const text = 'The ephemeral nature is ubiquitous.';
    const result = highlightWordsInText(text, words);

    expect(result).toContain('ephemeral');
    expect(result).toContain('ubiquitous');
    expect(result).toContain('lasting for a very short time');
    expect(result).toContain('present everywhere');
  });

  it('should parse highlighted text into segments', () => {
    const highlighted =
      'The <mark class="vocab-highlight" data-definition="short">ephemeral</mark> nature.';
    const segments = parseHighlightedText(highlighted);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({ type: 'text', content: 'The ' });
    expect(segments[1]).toEqual({ type: 'highlight', content: 'ephemeral', definition: 'short' });
    expect(segments[2]).toEqual({ type: 'text', content: ' nature.' });
  });
});
