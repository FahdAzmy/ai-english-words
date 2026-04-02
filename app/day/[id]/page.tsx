'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { deleteWord, getDayWords } from '@/lib/db/mock';
import { Word } from '@/lib/types';
import { Button } from '@/components/ui/button';
import WordList from '@/components/word-list';
import AddWordDialog from '@/components/add-word-dialog';
import AddWordsDialog from '@/components/add-words-dialog';
import EditWordDialog from '@/components/edit-word-dialog';
import {
  ArrowLeft,
  Layers,
  ListPlus,
  MessageSquareText,
  Music2,
  PenLine,
  Plus,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const practiceModes: Array<{
  id: 'story' | 'sentences' | 'dialogue' | 'writing' | 'music';
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'story', label: 'Story Generator', icon: ScrollText },
  { id: 'sentences', label: 'Daily Sentences', icon: MessageSquareText },
  { id: 'dialogue', label: 'Interactive Dialogue', icon: Layers },
  { id: 'writing', label: 'Writing Practice', icon: PenLine },
  { id: 'music', label: 'Music Practice', icon: Music2 },
];

export default function DayPage() {
  const params = useParams();
  const dayId = params.id as string;

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWord, setShowAddWord] = useState(false);
  const [showAddWords, setShowAddWords] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  useEffect(() => {
    async function loadWords() {
      try {
        const dayWords = await getDayWords(dayId);
        setWords(dayWords);
      } catch (error) {
        console.error('[v0] Failed to load words:', error);
      } finally {
        setLoading(false);
      }
    }

    loadWords();
  }, [dayId]);

  const dayNumber = useMemo(() => {
    const matched = dayId.match(/day_(\d+)/);
    return matched ? Number(matched[1]) : null;
  }, [dayId]);

  const handleDeleteWord = async (wordToDelete: Word) => {
    const shouldDelete = window.confirm(
      `Delete "${wordToDelete.word}" from this day?`
    );

    if (!shouldDelete) return;

    try {
      await deleteWord(wordToDelete.id);
      setWords((currentWords) =>
        currentWords.filter((word) => word.id !== wordToDelete.id)
      );
      setEditingWord((current) =>
        current?.id === wordToDelete.id ? null : current
      );
    } catch (error) {
      console.error('[v0] Failed to delete word:', error);
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <div className="vocab-mesh" aria-hidden="true" />
        <div className="relative z-10 rounded-2xl border border-border/40 bg-card/70 px-8 py-6 shadow-2xl backdrop-blur-xl">
          <p className="text-lg font-medium text-foreground">Loading words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="vocab-mesh" aria-hidden="true" />
      <div className="vocab-grid" aria-hidden="true" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl border border-border/40 bg-card/65 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
                {dayNumber ? `Day ${dayNumber}` : 'Day'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Tap any card to flip between English and Arabic.
              </p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Word Count</p>
              <p className="mt-1 text-3xl font-black text-foreground">{words.length}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => setShowAddWord(true)}
              className="h-11 rounded-xl bg-gradient-to-r from-primary to-accent px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Word
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowAddWords(true)}
              className="h-11 rounded-xl border border-border/50 bg-card/90 px-5 font-semibold text-white shadow-lg"
            >
              <ListPlus className="mr-2 h-4 w-4" />
              Add Words
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowActions((current) => !current)}
              className="h-11 rounded-xl border-primary/30 bg-primary/5 px-5 font-semibold"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Actions
            </Button>
          </div>
        </section>

        {showActions && (
          <section className="mb-8 rounded-3xl border border-border/40 bg-card/65 p-5 shadow-xl backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Practice Modes
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {practiceModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Link key={mode.id} href={`/day/${dayId}/practice/${mode.id}`}>
                    <div className="group rounded-2xl border border-border/50 bg-background/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-semibold text-foreground">{mode.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <WordList
          words={words}
          onEditWord={(word) => setEditingWord(word)}
          onDeleteWord={handleDeleteWord}
        />
      </main>

      <AddWordDialog
        dayId={dayId}
        isOpen={showAddWord}
        onClose={() => setShowAddWord(false)}
        onWordAdded={(newWord) => {
          setWords((currentWords) => [...currentWords, newWord]);
        }}
      />

      <AddWordsDialog
        dayId={dayId}
        isOpen={showAddWords}
        onClose={() => setShowAddWords(false)}
        onWordsAdded={(newWords) => {
          setWords((currentWords) => [...currentWords, ...newWords]);
        }}
      />

      <EditWordDialog
        word={editingWord}
        isOpen={Boolean(editingWord)}
        onClose={() => setEditingWord(null)}
        onWordUpdated={(updatedWord) => {
          setWords((currentWords) =>
            currentWords.map((word) =>
              word.id === updatedWord.id ? updatedWord : word
            )
          );
        }}
      />
    </div>
  );
}
