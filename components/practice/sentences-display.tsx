'use client';

import { ReactNode } from 'react';
import { Word } from '@/lib/types';

interface SentencesDisplayProps {
  sentences: string[];
  words: Word[];
}

export default function SentencesDisplay({ sentences, words }: SentencesDisplayProps) {
  const renderSentence = (sentence: string) => {
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
      while ((match = wp.pattern.exec(sentence)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          word: wp.word,
        });
      }
    });

    // Sort and deduplicate matches by index
    matches.sort((a, b) => a.index - b.index);
    const dedupMatches = matches.filter((m, i) => i === 0 || m.index !== matches[i - 1].index);

    // Build parts with highlighting
    dedupMatches.forEach((match, i) => {
      if (match.index >= lastIndex) {
        if (match.index > lastIndex) {
          parts.push(sentence.substring(lastIndex, match.index));
        }
        parts.push(
          <mark key={i} className="bg-purple-200/60 text-foreground font-semibold rounded px-1">
            {sentence.substring(match.index, match.index + match.length)}
          </mark>
        );
        lastIndex = match.index + match.length;
      }
    });

    if (lastIndex < sentence.length) {
      parts.push(sentence.substring(lastIndex));
    }

    return parts.length > 0 ? parts : sentence;
  };

  return (
    <div className="space-y-4">
      {sentences.map((sentence, index) => (
        <div key={index} className="rounded-lg border border-border bg-card/50 p-6 hover:border-primary/30 transition-colors">
          <div className="text-lg leading-relaxed text-foreground">
            {renderSentence(sentence)}
          </div>
        </div>
      ))}
    </div>
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
