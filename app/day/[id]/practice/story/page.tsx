"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Day, Word } from "@/lib/types";
import type { StoryGenre, DifficultyLevel } from "@/lib/types";
import {
  getCurrentUser,
  getDayWords,
  getUserDays,
  updateWordUsage,
} from "@/lib/db/mock";
import { generateLLMResponse } from "@/lib/llm";
import { requestStoryGeneration } from "@/lib/llm/client";
import { type StoryVocabularyWord } from "@/lib/llm/story-generator";
import { selectWordPool } from "@/lib/services/word-pool";
import PracticeHeader from "@/components/practice-header";
import StoryDisplay from "@/components/practice/story-display";
import PracticeFooter from "@/components/practice-footer";
import StoryGenreSelector from "@/components/practice/story-genre-selector";
import StoryDifficultySlider from "@/components/practice/story-difficulty-slider";
import HighlightedWords from "@/components/practice/highlighted-words";
import { ScrollText } from "lucide-react";

interface StoryWordEntry {
  word: Word;
  sourceDayNumber: number;
  isCurrentDay: boolean;
}

export default function StoryPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [story, setStory] = useState("");
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");
  const [generationWarning, setGenerationWarning] = useState("");

  // Genre and difficulty state
  const [selectedGenre, setSelectedGenre] = useState<StoryGenre>("daily-life");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<DifficultyLevel>("B1");

  // Word pool loaded flag
  const [wordsLoaded, setWordsLoaded] = useState(false);

  const dayNumberFromId = useMemo(() => {
    const matched = dayId.match(/day_(\d+)/);
    return matched ? Number(matched[1]) : null;
  }, [dayId]);

  // Load words on mount — do NOT auto-generate
  useEffect(() => {
    async function loadWords() {
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

        const mergedEntries = dedupeEntriesByWord([
          ...currentEntries,
          ...previousEntries,
        ]);
        const mergedWords = mergedEntries.map((entry) => entry.word);
        setSelectedWords(mergedWords);
        setWordsLoaded(true);

        if (mergedWords.length === 0) {
          setGenerationWarning(
            "No vocabulary words were found for this story. Add words first.",
          );
        }
      } catch (error) {
        console.error("[v0] Failed to load words:", error);
        setGenerationWarning("Unable to load vocabulary for this day.");
        setWordsLoaded(true);
      }
    }

    loadWords();
  }, [dayId, dayNumberFromId]);

  const handleGenerate = async () => {
    if (selectedWords.length === 0) {
      setGenerationWarning(
        "No vocabulary words available. Add words to this day first.",
      );
      return;
    }

    setGenerating(true);
    setStory("");
    setProviderLabel("");
    setGenerationWarning("");
    setCompleted(false);

    const llmWords: StoryVocabularyWord[] = selectedWords.map((word) => {
      const entry = findWordEntry(word);
      return {
        word: word.word,
        definition: word.definition,
        sourceDayNumber: entry?.sourceDayNumber || dayNumberFromId || 1,
        isCurrentDay: entry?.isCurrentDay ?? true,
      };
    });

    try {
      const generated = await requestStoryGeneration({
        dayId,
        currentDayNumber: dayNumberFromId || 1,
        words: llmWords,
        genre: selectedGenre,
        difficulty: selectedDifficulty,
      } as any);

      setStory(generated.story);
      setProviderLabel(`${generated.provider} / ${generated.model}`);
    } catch (generationError) {
      console.error(
        "[v0] LLM provider call failed, using fallback:",
        generationError,
      );
      const fallback = await generateLLMResponse("story", selectedWords);
      setStory(fallback.text);
      setProviderLabel("local fallback");
      setGenerationWarning(
        "LLM provider was not reachable. Using local fallback story.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async () => {
    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader
        title="Story Generator"
        subtitle="Select your preferences, then generate a story using your vocabulary"
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Settings Panel — always visible */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Story Settings
              </h2>
            </div>

            {/* Genre Selector */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Genre
              </label>
              <StoryGenreSelector
                selectedGenre={selectedGenre}
                onGenreChange={setSelectedGenre}
              />
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                Difficulty
              </label>
              <StoryDifficultySlider
                selectedDifficulty={selectedDifficulty}
                onDifficultyChange={setSelectedDifficulty}
              />
            </div>

            {/* Word Count Info */}
            {wordsLoaded && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Vocabulary words available
                </span>
                <span className="text-lg font-bold text-foreground">
                  {selectedWords.length}
                </span>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || selectedWords.length === 0}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating your story...
                </span>
              ) : story ? (
                "Regenerate Story"
              ) : (
                "Generate Story"
              )}
            </button>
          </div>

          {/* Generating State */}
          {generating && (
            <div className="flex items-center justify-center h-64 rounded-xl border border-border bg-card">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  Generating your story...
                </div>
                <div className="text-muted-foreground">
                  Using {selectedWords.length} words · {selectedGenre} ·{" "}
                  {selectedDifficulty}
                </div>
              </div>
            </div>
          )}

          {/* Story Display — shown after generation */}
          {story && !generating && (
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Today&apos;s Story
                </h2>
                <p className="text-muted-foreground text-sm">
                  Genre:{" "}
                  <span className="font-medium capitalize">
                    {selectedGenre}
                  </span>{" "}
                  · Difficulty:{" "}
                  <span className="font-medium">{selectedDifficulty}</span>
                </p>
                {providerLabel && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {providerLabel}
                  </p>
                )}
                {generationWarning && (
                  <p className="text-xs text-amber-600 mt-2">
                    {generationWarning}
                  </p>
                )}
              </div>

              <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                <HighlightedWords
                  text={story}
                  words={selectedWords.map((w) => ({
                    word: w.word,
                    definition: w.definition,
                  }))}
                />
              </div>
            </div>
          )}

          {/* No story yet — show placeholder */}
          {!story && !generating && wordsLoaded && (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-border bg-card/50">
              <ScrollText className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-muted-foreground">
                No story generated yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select your genre and difficulty above, then click Generate
                Story
              </p>
            </div>
          )}

          {/* Completion Section — shown after story */}
          {story && !generating && !completed && (
            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6">
              <h3 className="font-bold text-foreground mb-2">
                Ready to continue?
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Make sure you understand how each vocabulary word is used in the
                story above.
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
            <div className="rounded-xl border-2 border-accent bg-accent/5 p-6 text-center">
              <p className="text-lg font-semibold text-foreground">
                Great job! Story completed
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                You&apos;ve marked your progress on {selectedWords.length} words
              </p>
            </div>
          )}
        </div>
      </main>

      <PracticeFooter dayId={dayId} currentMode="story" />
    </div>
  );
}

// Helper to track word entry metadata
const wordEntryMap = new Map<
  string,
  { sourceDayNumber: number; isCurrentDay: boolean }
>();

function findWordEntry(
  word: Word,
): { sourceDayNumber: number; isCurrentDay: boolean } | undefined {
  return wordEntryMap.get(word.id);
}

function resolveCurrentDay(
  userDays: Day[],
  dayId: string,
  dayNumberFromId: number | null,
): Day | null {
  const fromId = userDays.find((day) => day.id === dayId);
  if (fromId) return fromId;

  if (dayNumberFromId === null) return null;
  return userDays.find((day) => day.day_number === dayNumberFromId) || null;
}

async function buildPreviousDayEntries(
  userDays: Day[],
  currentDayNumber: number,
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
    }),
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
    wordEntryMap.set(entry.word.id, {
      sourceDayNumber: entry.sourceDayNumber,
      isCurrentDay: entry.isCurrentDay,
    });
    unique.push(entry);
  }

  return unique;
}
