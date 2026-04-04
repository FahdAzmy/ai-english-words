'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Word } from '@/lib/types';
import { updateWordUsage } from '@/lib/db/mock';
import { generateLLMResponse } from '@/lib/llm';
import { requestPracticeGeneration } from '@/lib/llm/client';
import { type PracticeVocabularyWord } from '@/lib/llm/practice-generator';
import { buildPracticeWordContext } from '@/lib/services/practice-context';
import PracticeHeader from '@/components/practice-header';
import SentencesDisplay from '@/components/practice/sentences-display';
import PracticeFooter from '@/components/practice-footer';

export default function SentencesPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [providerLabel, setProviderLabel] = useState('');
  const [generationWarning, setGenerationWarning] = useState('');

  useEffect(() => {
    async function loadAndGenerate() {
      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 5 });
        const allWords = context.words;

        if (allWords.length === 0) {
          setSelectedWords([]);
          setSentences(['Add words to this day first, then generate daily sentences.']);
          setGenerationWarning('No vocabulary words were found for this practice.');
          return;
        }

        const llmWords: PracticeVocabularyWord[] = context.entries.map((entry) => ({
          word: entry.word.word,
          definition: entry.word.definition,
          sourceDayNumber: entry.sourceDayNumber,
          isCurrentDay: entry.isCurrentDay,
        }));

        try {
          const generated = await requestPracticeGeneration({
            mode: 'sentences',
            dayId,
            currentDayNumber: context.currentDayNumber,
            words: llmWords,
          });

          setSentences(parseSentences(generated.text));
          setSelectedWords(pickUsedWords(allWords, generated.wordsUsed));
          setProviderLabel(`${generated.provider} / ${generated.model}`);
          setGenerationWarning('');
        } catch (generationError) {
          console.error('[v0] Sentences LLM provider call failed, using fallback:', generationError);
          const fallback = await generateLLMResponse('sentences', allWords);
          setSentences(parseSentences(fallback.text));
          setSelectedWords(pickUsedWords(allWords, fallback.wordsUsed));
          setProviderLabel('local fallback');
          setGenerationWarning(
            'LLM provider was not reachable. Using local fallback sentences until provider env is configured.'
          );
        }
      } catch (error) {
        console.error('[v0] Failed to load sentences:', error);
        setSentences(['Unable to generate sentences right now.']);
        setGenerationWarning('Failed to load sentence practice.');
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerate();
  }, [dayId]);

  const handleComplete = async () => {
    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader title="Daily Sentences" subtitle="Build vocabulary through meaningful daily-life sentences" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Generating sentences...</div>
              <div className="text-muted-foreground">Mixing day words with previous days naturally</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Daily Sentences</h2>
              <p className="text-muted-foreground text-sm">
                Practical daily-life examples using current and previous day vocabulary where useful.
              </p>
              {providerLabel && (
                <p className="text-xs text-muted-foreground mt-2">Provider: {providerLabel}</p>
              )}
              {generationWarning && (
                <p className="text-xs text-amber-600 mt-2">{generationWarning}</p>
              )}
            </div>

            <SentencesDisplay sentences={sentences} words={selectedWords} />

            {!completed && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
                <h3 className="font-bold text-foreground mb-2">Ready to continue?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Make sure you understand how each word is used in these sentences.
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
                <p className="text-lg font-semibold text-foreground">Great job! Sentences completed</p>
                <p className="text-muted-foreground text-sm mt-2">
                  You&apos;ve practiced {selectedWords.length} words in context
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="sentences" />
    </div>
  );
}

function parseSentences(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return lines.map((line) => ensureSentenceEnding(line));
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => ensureSentenceEnding(sentence));
}

function ensureSentenceEnding(sentence: string): string {
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function pickUsedWords(allWords: Word[], usedWords: string[]): Word[] {
  if (!usedWords.length) return allWords;

  const usedSet = new Set(usedWords.map((word) => word.toLowerCase()));
  const filtered = allWords.filter((word) => usedSet.has(word.word.toLowerCase()));
  return filtered.length > 0 ? filtered : allWords;
}
