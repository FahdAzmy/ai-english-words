'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Word } from '@/lib/types';
import { updateWordUsage } from '@/lib/db/mock';
import { generateLLMResponse } from '@/lib/llm';
import { requestPracticeGeneration } from '@/lib/llm/client';
import { type PracticeVocabularyWord } from '@/lib/llm/practice-generator';
import { buildPracticeWordContext } from '@/lib/services/practice-context';
import PracticeHeader from '@/components/practice-header';
import DialogueDisplay, {
  type DialogueQuizResult,
} from '@/components/practice/dialogue-display';
import PracticeFooter from '@/components/practice-footer';

export default function DialoguePracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [choiceWords, setChoiceWords] = useState<Word[]>([]);
  const [dialogue, setDialogue] = useState('');
  const [loading, setLoading] = useState(true);
  const [providerLabel, setProviderLabel] = useState('');
  const [generationWarning, setGenerationWarning] = useState('');
  const [quizResult, setQuizResult] = useState<DialogueQuizResult | null>(null);
  const [usageSaved, setUsageSaved] = useState(false);

  useEffect(() => {
    async function loadAndGenerate() {
      setLoading(true);
      setQuizResult(null);
      setUsageSaved(false);

      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 5 });
        const allWords = context.words;
        const currentDayWords = uniqueWords(
          context.entries.filter((entry) => entry.isCurrentDay).map((entry) => entry.word)
        );

        if (allWords.length === 0) {
          setChoiceWords([]);
          setDialogue('A: Add words to this day first.\nB: Then dialogue practice will be generated.');
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
            mode: 'dialogue',
            dayId,
            currentDayNumber: context.currentDayNumber,
            words: llmWords,
            requestNonce: `dialogue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          });

          const requiredDayWords = currentDayWords.length > 0 ? currentDayWords : allWords;
          const wordsForChoices = requiredDayWords;

          setDialogue(
            ensureDialogueContainsRequiredWords(
              generated.text,
              requiredDayWords.map((word) => word.word)
            )
          );
          setChoiceWords(wordsForChoices);
          setProviderLabel(`${generated.provider} / ${generated.model}`);
          setGenerationWarning('');
        } catch (generationError) {
          console.error('[v0] Dialogue LLM provider call failed, using fallback:', generationError);
          const fallback = await generateLLMResponse('dialogue', allWords);

          const requiredDayWords = currentDayWords.length > 0 ? currentDayWords : allWords;
          const wordsForChoices = requiredDayWords;

          setDialogue(
            ensureDialogueContainsRequiredWords(
              fallback.text,
              requiredDayWords.map((word) => word.word)
            )
          );
          setChoiceWords(wordsForChoices);
          setProviderLabel('local fallback');
          setGenerationWarning(
            'LLM provider was not reachable. Using local fallback dialogue until provider env is configured.'
          );
        }
      } catch (error) {
        console.error('[v0] Failed to load dialogue:', error);
        setDialogue('A: Sorry, dialogue generation is unavailable right now.\nB: Please try again in a moment.');
        setChoiceWords([]);
        setGenerationWarning('Failed to load dialogue practice.');
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerate();
  }, [dayId]);

  const handleQuizComplete = useCallback(
    async (result: DialogueQuizResult) => {
      setQuizResult(result);

      if (usageSaved) return;

      const correctWordSet = new Set(result.correctWords);
      const practicedWords = choiceWords.filter((word) =>
        correctWordSet.has(word.word.toLowerCase())
      );

      if (practicedWords.length > 0) {
        await Promise.all(practicedWords.map((word) => updateWordUsage(word.id)));
      }

      setUsageSaved(true);
    },
    [choiceWords, usageSaved]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader
        title="Interactive Dialogue"
        subtitle="Fill each blank with the correct day word and get instant feedback"
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Loading dialogue...</div>
              <div className="text-muted-foreground">Preparing sentence-by-sentence quiz practice</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Every sentence includes one blank. Choose from your day words, and you will see
                right/wrong feedback instantly.
              </p>
              {providerLabel && (
                <p className="text-xs text-muted-foreground mt-2">Provider: {providerLabel}</p>
              )}
              {generationWarning && (
                <p className="text-xs text-amber-600 mt-2">{generationWarning}</p>
              )}
            </div>

            <DialogueDisplay
              dialogue={dialogue}
              choiceWords={choiceWords}
              onComplete={handleQuizComplete}
            />

            {quizResult && (
              <div className="rounded-lg border-2 border-accent bg-accent/5 p-6">
                <p className="font-bold text-foreground mb-2">Dialogue quiz completed</p>
                <p className="text-sm text-muted-foreground">
                  Correct: {quizResult.correctCount}/{quizResult.totalCount} | Wrong:{' '}
                  {quizResult.incorrectCount}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Day words used for choices:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {choiceWords.map((word) => (
                  <div key={word.id} className="rounded bg-green-500/5 border border-green-500/20 p-4">
                    <p className="font-semibold text-green-600">{word.word}</p>
                    <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                  </div>
                ))}
              </div>
              {choiceWords.length === 0 && (
                <p className="text-sm text-muted-foreground">No day words available for choices.</p>
              )}
            </div>
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="dialogue" />
    </div>
  );
}

function uniqueWords(words: Word[]): Word[] {
  const seen = new Set<string>();
  const unique: Word[] = [];

  words.forEach((word) => {
    const key = word.word.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(word);
  });

  return unique;
}

function ensureDialogueContainsRequiredWords(text: string, requiredWords: string[]): string {
  const dedupedRequired = dedupeRequiredWords(requiredWords);
  if (dedupedRequired.length === 0) return text;

  const missingWords = dedupedRequired.filter((word) => {
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    return !regex.test(text);
  });

  if (missingWords.length === 0) return text;

  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const lastLine = lines[lines.length - 1] || '';
  const startsWithB = /^B:/i.test(lastLine.trim());
  let nextSpeaker: 'A' | 'B' = startsWithB ? 'A' : 'B';

  const extraLines = missingWords.map((word) => {
    const line = `${nextSpeaker}: I will use ${word} naturally in this sentence.`;
    nextSpeaker = nextSpeaker === 'A' ? 'B' : 'A';
    return line;
  });

  return [...lines, ...extraLines].join('\n').trim();
}

function dedupeRequiredWords(words: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(word);
  }

  return unique;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
