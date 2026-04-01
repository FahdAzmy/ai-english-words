'use client';

import { ReactNode } from 'react';
import { Word } from '@/lib/types';

interface StoryDisplayProps {
  story: string;
  words: Word[];
}

export default function StoryDisplay({ story, words }: StoryDisplayProps) {
  // Parse story and highlight words
  const renderStory = () => {
    const text = story;
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    // Create a regex pattern for all words (case insensitive)
    const wordPatterns = words.map((w) => ({
      word: w.word,
      pattern: new RegExp(`\\b${escapeRegExp(w.word)}\\b`, 'gi'),
    }));

    // Find all word occurrences
    const matches: Array<{ index: number; length: number; word: string }> = [];

    wordPatterns.forEach((wp) => {
      let match;
      while ((match = wp.pattern.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          word: wp.word,
        });
      }
    });

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Build parts with highlighting
    matches.forEach((match, i) => {
      if (match.index >= lastIndex) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(
          <mark key={i} className="bg-blue-200/60 text-foreground font-semibold rounded px-1">
            {text.substring(match.index, match.index + match.length)}
          </mark>
        );
        lastIndex = match.index + match.length;
      }
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : story;
  };

  return (
    <div className="text-lg leading-relaxed text-foreground">
      {renderStory()}
    </div>
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
