'use client';

import { ReactNode } from 'react';
import { Word } from '@/lib/types';

interface DialogueDisplayProps {
  dialogue: string;
  words: Word[];
}

export default function DialogueDisplay({ dialogue, words }: DialogueDisplayProps) {
  // Parse dialogue lines (assuming format like "Person: dialogue text")
  const lines = dialogue.split('\n').filter((line) => line.trim().length > 0);

  const renderLine = (line: string) => {
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
      while ((match = wp.pattern.exec(line)) !== null) {
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
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <mark key={i} className="bg-green-200/60 text-foreground font-semibold rounded px-1">
            {line.substring(match.index, match.index + match.length)}
          </mark>
        );
        lastIndex = match.index + match.length;
      }
    });

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-6">Dialogue Scenario</h2>
      <div className="space-y-3">
        {lines.map((line, index) => {
          const isQuestion = line.includes(':');
          const [speaker, text] = isQuestion ? line.split(':').map((s) => s.trim()) : ['', line];

          return (
            <div key={index} className={`p-4 rounded-lg ${isQuestion ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/5 border border-secondary/20'}`}>
              {speaker && (
                <p className={`font-semibold mb-1 ${isQuestion ? 'text-primary' : 'text-secondary'}`}>
                  {speaker}:
                </p>
              )}
              <p className="text-foreground leading-relaxed">
                {renderLine(text || line)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
