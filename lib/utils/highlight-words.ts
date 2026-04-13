export interface VocabularyWord {
  word: string;
  definition: string;
}

export interface HighlightedSegment {
  type: 'text' | 'highlight';
  content: string;
  definition?: string;
}

export function highlightWordsInText(
  text: string,
  words: VocabularyWord[]
): string {
  if (!text) return '';
  if (words.length === 0) return text;

  // Escape regex special characters in words
  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Build regex pattern for all words (case-insensitive)
  const patterns = words.map((w) => escapeRegExp(w.word));
  const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');

  // Find all matches and their definitions
  const wordMap = new Map<string, string>();
  words.forEach((w) => {
    wordMap.set(w.word.toLowerCase(), w.definition);
  });

  // Replace matches with highlighted markup
  return text.replace(regex, (match) => {
    const definition = wordMap.get(match.toLowerCase()) || '';
    return `<mark class="vocab-highlight" data-definition="${definition}">${match}</mark>`;
  });
}

export function parseHighlightedText(
  html: string
): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  const regex =
    /<mark class="vocab-highlight" data-definition="([^"]*)">([^<]*)<\/mark>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    // Add text before highlight
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: html.slice(lastIndex, match.index),
      });
    }

    // Add highlighted segment
    segments.push({
      type: 'highlight',
      content: match[2],
      definition: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < html.length) {
    segments.push({
      type: 'text',
      content: html.slice(lastIndex),
    });
  }

  return segments;
}
