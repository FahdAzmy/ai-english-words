'use client';

import { useState } from 'react';
import { parseHighlightedText, type VocabularyWord } from '@/lib/utils/highlight-words';
import { cn } from '@/lib/utils';

interface HighlightedWordsProps {
  text: string;
  words: VocabularyWord[];
  className?: string;
}

export default function HighlightedWords({
  text,
  words,
  className,
}: HighlightedWordsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Generate highlighted HTML
  const highlightedHtml = (() => {
    const { highlightWordsInText } = require('@/lib/utils/highlight-words');
    return highlightWordsInText(text, words);
  })();

  const segments = parseHighlightedText(highlightedHtml);

  return (
    <div className={cn('relative', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={index} className="text-foreground">
              {segment.content}
            </span>
          );
        }

        // Highlighted word
        return (
          <span
            key={index}
            className="relative inline-block"
            onMouseEnter={() => segment.definition && setActiveTooltip(segment.content)}
            onMouseLeave={() => setActiveTooltip(null)}
            onTouchStart={() => segment.definition && setActiveTooltip(
              activeTooltip === segment.content ? null : segment.content
            )}
          >
            <mark className="rounded bg-primary/15 px-1 text-primary font-semibold cursor-help transition-colors hover:bg-primary/25">
              {segment.content}
            </mark>
            {activeTooltip === segment.content && segment.definition && (
              <div className="absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-xl">
                <p className="font-medium text-foreground">{segment.definition}</p>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
