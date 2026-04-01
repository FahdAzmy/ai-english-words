'use client';

import { Word } from '@/lib/types';
import { useState } from 'react';

interface WritingDisplayProps {
  words: Word[];
}

export default function WritingDisplay({ words }: WritingDisplayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-2xl font-bold text-foreground mb-2">Writing Challenge</h2>
      <p className="text-muted-foreground mb-6">
        Use your creativity to write a paragraph or story using these vocabulary words. The more naturally you incorporate them, the better!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {words.map((word) => (
          <div
            key={word.id}
            className="rounded-lg border border-border/50 bg-background/50 p-4 hover:border-accent/30 transition-colors cursor-pointer"
            onClick={() => setExpandedId(expandedId === word.id ? null : word.id)}
          >
            <p className="font-bold text-foreground text-lg">{word.word}</p>
            {expandedId === word.id && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-sm text-muted-foreground leading-relaxed">{word.definition}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded bg-accent/10 border border-accent/20">
        <p className="text-sm text-foreground font-semibold mb-2">Writing Tips:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Write naturally - don&apos;t force the words</li>
          <li>• Use varied sentence structures</li>
          <li>• Aim for clarity and coherence</li>
          <li>• It&apos;s okay if not every word is used</li>
        </ul>
      </div>
    </div>
  );
}
