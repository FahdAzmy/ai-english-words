'use client';

import { useState } from 'react';
import { Word } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';

interface WordListProps {
  words: Word[];
  onEditWord?: (word: Word) => void;
  onDeleteWord?: (word: Word) => void;
}

export default function WordList({ words, onEditWord, onDeleteWord }: WordListProps) {
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  const toggleCard = (wordId: string) => {
    setFlippedIds((current) => ({
      ...current,
      [wordId]: !current[wordId],
    }));
  };

  if (words.length === 0) {
    return (
      <div className="rounded-3xl border border-border/40 bg-card/70 p-10 text-center shadow-xl backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">No Words Yet</p>
        <p className="mt-2 text-lg font-medium text-foreground">Add your first word to start building this deck.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {words.map((word, index) => {
        const isFlipped = !!flippedIds[word.id];

        return (
          <div
            key={word.id}
            className="relative h-56 w-full [perspective:1200px]"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <button
              type="button"
              onClick={() => toggleCard(word.id)}
              className="group h-full w-full text-left"
            >
              <div
                className={`relative h-full w-full rounded-2xl border border-border/50 bg-card/95 shadow-lg transition-all duration-500 [transform-style:preserve-3d] group-hover:-translate-y-0.5 group-hover:shadow-2xl ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <div className="absolute inset-0 rounded-2xl border border-white/35 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />

                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-5 [backface-visibility:hidden]">
                  <p className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    English
                  </p>
                  <p className="mt-4 line-clamp-2 text-center text-2xl font-black tracking-tight text-foreground">
                    {word.word}
                  </p>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Click to show translation</p>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-primary/15 p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Arabic
                  </p>
                  <p className="mt-4 line-clamp-2 text-center text-2xl font-black tracking-tight text-foreground">
                    {word.definition}
                  </p>
                  {word.example_sentence && (
                    <p className="mt-3 line-clamp-3 px-2 text-center text-xs text-muted-foreground sm:text-sm">
                      {word.example_sentence}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Click to flip back</p>
                </div>
              </div>
            </button>

            {(onEditWord || onDeleteWord) && (
              <div className="absolute right-3 top-3 z-20 flex gap-2">
                {onEditWord && (
                  <button
                    type="button"
                    onClick={() => onEditWord(word)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}

                {onDeleteWord && (
                  <button
                    type="button"
                    onClick={() => onDeleteWord(word)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-500 shadow-sm transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
