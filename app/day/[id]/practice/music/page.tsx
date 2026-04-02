'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createDayMusic, getDayMusic } from '@/lib/db/mock';
import { generateLLMResponse } from '@/lib/llm';
import { requestPracticeGeneration } from '@/lib/llm/client';
import { type PracticeVocabularyWord } from '@/lib/llm/practice-generator';
import { buildPracticeWordContext, type PracticeWordEntry } from '@/lib/services/practice-context';
import { Music, Word } from '@/lib/types';
import PracticeFooter from '@/components/practice-footer';
import PracticeHeader from '@/components/practice-header';

export default function MusicPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentDayNumber, setCurrentDayNumber] = useState(1);
  const [wordEntries, setWordEntries] = useState<PracticeWordEntry[]>([]);
  const [availableWords, setAvailableWords] = useState<Word[]>([]);
  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [providerLabel, setProviderLabel] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const applySavedMusic = useCallback((music: Music, words: Word[]) => {
    setLyrics(music.lyrics);
    setSavedAt(music.created_at);
    setProviderLabel(formatProviderLabel(music.provider, music.model));
    setSelectedWords(pickUsedWords(words, music.words_used));
  }, []);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);

      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 0 });
        setCurrentDayNumber(context.currentDayNumber);
        setWordEntries(context.entries);
        setAvailableWords(context.words);
        setSelectedWords(context.words);

        const savedMusic = await getDayMusic(dayId);

        if (savedMusic) {
          applySavedMusic(savedMusic, context.words);
          setStatusMessage('Saved song loaded. Click Create Music to generate a new one.');
        } else if (context.words.length === 0) {
          setStatusMessage('Add words to this day first, then click Create Music.');
        } else {
          setStatusMessage('No saved song yet. Click Create Music to generate and save one.');
        }
      } catch (error) {
        console.error('[v0] Failed to load music page:', error);
        setStatusMessage('Unable to load this page right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [applySavedMusic, dayId]);

  const handleCreateMusic = useCallback(async () => {
    if (wordEntries.length === 0) {
      setStatusMessage('Add day words first, then create music.');
      return;
    }

    setCreating(true);

    try {
      const llmWords: PracticeVocabularyWord[] = wordEntries.map((entry) => ({
        word: entry.word.word,
        definition: entry.word.definition,
        sourceDayNumber: entry.sourceDayNumber,
        isCurrentDay: entry.isCurrentDay,
      }));

      const generated = await requestPracticeGeneration({
        mode: 'music',
        dayId,
        currentDayNumber,
        words: llmWords,
      });

      const processedLyrics = enforceMusicRequirements(
        generated.text,
        wordEntries.map((entry) => entry.word.word)
      );
      const usedWords = dedupeWords(wordEntries.map((entry) => entry.word.word));

      const saved = await createDayMusic(
        dayId,
        processedLyrics,
        usedWords,
        generated.provider,
        generated.model
      );

      applySavedMusic(saved, availableWords);
      setStatusMessage('Music created and saved. Opening Music action again will show this same song.');
    } catch (generationError) {
      console.error('[v0] Music generation failed, falling back to local mock:', generationError);

      try {
        const fallback = await generateLLMResponse('music', availableWords);
        const processedLyrics = enforceMusicRequirements(
          fallback.text,
          wordEntries.map((entry) => entry.word.word)
        );
        const usedWords = dedupeWords(wordEntries.map((entry) => entry.word.word));
        const saved = await createDayMusic(
          dayId,
          processedLyrics,
          usedWords,
          'local fallback',
          'mock'
        );

        applySavedMusic(saved, availableWords);
        setStatusMessage('Provider unavailable. Saved a local fallback song.');
      } catch (fallbackError) {
        console.error('[v0] Music fallback failed:', fallbackError);
        setStatusMessage('Failed to create music right now. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  }, [wordEntries, dayId, currentDayNumber, availableWords, applySavedMusic]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader
        title="Music Practice"
        subtitle="Open this page to view the saved song. Click Create Music only when you want a new one."
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Loading music...</div>
              <div className="text-muted-foreground">Checking if this day already has a saved song</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Saved Song</h2>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>

              <Button
                onClick={handleCreateMusic}
                disabled={creating || availableWords.length === 0}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              >
                {creating ? 'Creating Music...' : 'Create Music'}
              </Button>

              {providerLabel && (
                <p className="text-xs text-muted-foreground">Provider: {providerLabel}</p>
              )}
              {savedAt && (
                <p className="text-xs text-muted-foreground">Saved at: {new Date(savedAt).toLocaleString('en-US')}</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Lyrics</h3>
              {lyrics ? (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">{lyrics}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">No song saved yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Day Words Used</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedWords.map((word) => (
                  <div key={word.id} className="rounded bg-primary/5 border border-primary/20 p-4">
                    <p className="font-semibold text-primary">{word.word}</p>
                    <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                  </div>
                ))}
              </div>
              {selectedWords.length === 0 && (
                <p className="text-sm text-muted-foreground">No words available yet for this day.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="music" />
    </div>
  );
}

function pickUsedWords(allWords: Word[], usedWords: string[]): Word[] {
  if (!usedWords.length) return allWords;

  const usedSet = new Set(usedWords.map((word) => word.toLowerCase()));
  const filtered = allWords.filter((word) => usedSet.has(word.word.toLowerCase()));
  return filtered.length > 0 ? filtered : allWords;
}

function formatProviderLabel(provider: string | null, model: string | null): string {
  if (!provider && !model) return '';
  if (provider && model) return `${provider} / ${model}`;
  return provider || model || '';
}

function enforceMusicRequirements(lyrics: string, requiredWords: string[]): string {
  const MIN_WORDS = 170;
  const uniqueRequiredWords = dedupeWords(requiredWords);
  let output = lyrics.trim();

  const missingWords = getMissingWords(output, uniqueRequiredWords);
  if (missingWords.length > 0) {
    const bridgeLines = chunkWords(missingWords, 6).map(
      (chunk) => `I keep these words in my rhythm: ${chunk.join(', ')}.`
    );
    output = `${output}\n\nVocabulary Bridge:\n${bridgeLines.join('\n')}`;
  }

  let totalWords = countWords(output);
  while (totalWords < MIN_WORDS && uniqueRequiredWords.length > 0) {
    output = `${output}\n\nExtended Chorus:\nI sing ${uniqueRequiredWords.join(', ')} and remember them in daily life.`;
    totalWords = countWords(output);
  }

  const remainingMissing = getMissingWords(output, uniqueRequiredWords);
  if (remainingMissing.length > 0) {
    output = `${output}\n\nFinal Vocabulary Line:\n${remainingMissing.join(', ')}.`;
  }

  if (uniqueRequiredWords.length > 0) {
    output = `${output}\n\nAll Vocabulary Words:\n${uniqueRequiredWords.join(', ')}.`;
  }

  return output;
}

function getMissingWords(text: string, requiredWords: string[]): string[] {
  return requiredWords.filter((word) => {
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return !regex.test(text);
  });
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function chunkWords(words: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < words.length; index += size) {
    chunks.push(words.slice(index, index + size));
  }
  return chunks;
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  words.forEach((word) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(trimmed);
  });

  return unique;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
