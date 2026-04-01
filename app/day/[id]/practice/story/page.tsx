'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Day, Word } from '@/lib/types';
import { getCurrentUser, getDayWords, getUserDays, updateWordUsage } from '@/lib/db/mock';
import { generateLLMResponse } from '@/lib/llm';
import { requestStoryGeneration } from '@/lib/llm/client';
import { type StoryVocabularyWord } from '@/lib/llm/story-generator';
import { selectWordPool } from '@/lib/services/word-pool';
import PracticeHeader from '@/components/practice-header';
import StoryDisplay from '@/components/practice/story-display';
import PracticeFooter from '@/components/practice-footer';

interface StoryWordEntry {
  word: Word;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export default function StoryPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [providerLabel, setProviderLabel] = useState('');
  const [generationWarning, setGenerationWarning] = useState('');

  const dayNumberFromId = useMemo(() => {
    const matched = dayId.match(/day_(\d+)/);
    return matched ? Number(matched[1]) : null;
  }, [dayId]);

  useEffect(() => {
    async function loadAndGenerate() {
      try {
        const dayWords = await getDayWords(dayId);

        const currentUser = await getCurrentUser();
        const userDays = currentUser ? await getUserDays(currentUser.id) : [];
        const currentDay = resolveCurrentDay(userDays, dayId, dayNumberFromId);

        const previousEntries = currentDay
          ? await buildPreviousDayEntries(userDays, currentDay.day_number)
          : [];

        const currentEntries: StoryWordEntry[] = dayWords.map((word) => ({
          word,
          sourceDayNumber: currentDay?.day_number || dayNumberFromId || 1,
          isCurrentDay: true,
        }));

        const mergedEntries = dedupeEntriesByWord([...currentEntries, ...previousEntries]);
        const mergedWords = mergedEntries.map((entry) => entry.word);
        setSelectedWords(mergedWords);

        if (mergedWords.length === 0) {
          setStory('Add words to this day first, then generate your story.');
          setProviderLabel('');
          setGenerationWarning('No vocabulary words were found for this story.');
          return;
        }

        const llmWords: StoryVocabularyWord[] = mergedEntries.map((entry) => ({
          word: entry.word.word,
          definition: entry.word.definition,
          sourceDayNumber: entry.sourceDayNumber,
          isCurrentDay: entry.isCurrentDay,
        }));

        try {
          const generated = await requestStoryGeneration({
            dayId,
            currentDayNumber: currentDay?.day_number || dayNumberFromId || 1,
            words: llmWords,
          });

          setStory(generated.story);
          setProviderLabel(`${generated.provider} / ${generated.model}`);
          setGenerationWarning('');
        } catch (generationError) {
          console.error('[v0] LLM provider call failed, using fallback:', generationError);
          const fallback = await generateLLMResponse('story', mergedWords);
          setStory(fallback.text);
          setProviderLabel('local fallback');
          setGenerationWarning(
            'LLM provider was not reachable. Using local fallback story until provider env is configured.'
          );
        }
      } catch (error) {
        console.error('[v0] Failed to load story:', error);
        setGenerationWarning('Unable to generate story for this day.');
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerate();
  }, [dayId, dayNumberFromId]);

  const handleComplete = async () => {
    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader title="Story Generator" subtitle="Read and understand vocabulary in context" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Generating your story...</div>
              <div className="text-muted-foreground">Using day words plus 5 words from each previous day</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Today&apos;s Story</h2>
                <p className="text-muted-foreground text-sm">
                  Generated from current day words and 5 words from each previous day.
                </p>
                {providerLabel && (
                  <p className="text-xs text-muted-foreground mt-2">Provider: {providerLabel}</p>
                )}
                {generationWarning && (
                  <p className="text-xs text-amber-600 mt-2">{generationWarning}</p>
                )}
              </div>

              <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                <StoryDisplay story={story} words={selectedWords} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Vocabulary in this story:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedWords.map((word) => (
                  <div key={word.id} className="rounded bg-primary/5 border border-primary/20 p-4">
                    <p className="font-semibold text-primary">{word.word}</p>
                    <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                  </div>
                ))}
              </div>
            </div>

            {!completed && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
                <h3 className="font-bold text-foreground mb-2">Ready to continue?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Make sure you understand how each vocabulary word is used in the story above.
                </p>
                <button
                  onClick={handleComplete}
                  className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Mark as Complete & Continue
                </button>
              </div>
            )}

            {completed && (
              <div className="rounded-lg border-2 border-accent bg-accent/5 p-6 text-center">
                <p className="text-lg font-semibold text-foreground">Great job! Story completed</p>
                <p className="text-muted-foreground text-sm mt-2">
                  You&apos;ve marked your progress on {selectedWords.length} words
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="story" />
    </div>
  );
}

function resolveCurrentDay(
  userDays: Day[],
  dayId: string,
  dayNumberFromId: number | null
): Day | null {
  const fromId = userDays.find((day) => day.id === dayId);
  if (fromId) return fromId;

  if (dayNumberFromId === null) return null;
  return userDays.find((day) => day.day_number === dayNumberFromId) || null;
}

async function buildPreviousDayEntries(
  userDays: Day[],
  currentDayNumber: number
): Promise<StoryWordEntry[]> {
  const previousDays = userDays
    .filter((day) => day.day_number < currentDayNumber)
    .sort((a, b) => a.day_number - b.day_number);

  const entriesByDay = await Promise.all(
    previousDays.map(async (day) => {
      const words = await getDayWords(day.id);
      const selected = selectWordPool(words, Math.min(5, words.length));
      return selected.map((word) => ({
        word,
        sourceDayNumber: day.day_number,
        isCurrentDay: false,
      }));
    })
  );

  return entriesByDay.flat();
}

function dedupeEntriesByWord(entries: StoryWordEntry[]): StoryWordEntry[] {
  const seen = new Set<string>();
  const unique: StoryWordEntry[] = [];

  for (const entry of entries) {
    const key = entry.word.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  return unique;
}
