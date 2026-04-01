'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Word } from '@/lib/types';
import { updateWordUsage } from '@/lib/db/mock';
import { generateFeedback, validateResponse } from '@/lib/llm';
import { requestPracticeGeneration } from '@/lib/llm/client';
import { type PracticeVocabularyWord } from '@/lib/llm/practice-generator';
import { buildPracticeWordContext } from '@/lib/services/practice-context';
import PracticeHeader from '@/components/practice-header';
import WritingDisplay from '@/components/practice/writing-display';
import PracticeFooter from '@/components/practice-footer';

type FeedbackResult = Awaited<ReturnType<typeof generateFeedback>>;

export default function WritingPracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [writingBrief, setWritingBrief] = useState('');
  const [userWriting, setUserWriting] = useState('');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [providerLabel, setProviderLabel] = useState('');
  const [generationWarning, setGenerationWarning] = useState('');

  useEffect(() => {
    async function loadWordsAndBrief() {
      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 5 });
        const allWords = context.words;

        if (allWords.length === 0) {
          setSelectedWords([]);
          setWritingBrief('Add words to this day first, then generate writing practice.');
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
            mode: 'writing',
            dayId,
            currentDayNumber: context.currentDayNumber,
            words: llmWords,
          });

          setWritingBrief(generated.text);
          setSelectedWords(pickUsedWords(allWords, generated.wordsUsed));
          setProviderLabel(`${generated.provider} / ${generated.model}`);
          setGenerationWarning('');
        } catch (generationError) {
          console.error('[v0] Writing LLM provider call failed, using static brief:', generationError);
          setWritingBrief([
            'Topic: A normal day where you solve a small problem using clear communication.',
            'Situation: Write as if you are explaining the day to a friend.',
            'Goal: Use current day words first, then mix previous day words only when natural.',
            'Starter 1: This morning, I had to make a quick decision at work.',
            'Starter 2: At first, I felt uncertain, but then I found a practical solution.',
            'Starter 3: By the end of the day, I learned something useful from the experience.',
          ].join('\n'));
          setSelectedWords(allWords);
          setProviderLabel('local fallback');
          setGenerationWarning(
            'LLM provider was not reachable. Using a local writing brief until provider env is configured.'
          );
        }
      } catch (error) {
        console.error('[v0] Failed to load writing practice:', error);
        setWritingBrief('Unable to load writing brief right now.');
        setGenerationWarning('Failed to load writing practice.');
      } finally {
        setLoading(false);
      }
    }

    loadWordsAndBrief();
  }, [dayId]);

  const handleWritingChange = (text: string) => {
    setUserWriting(text);
    const trimmedText = text.trim();
    setWordCount(trimmedText ? trimmedText.split(/\s+/).length : 0);
  };

  const handleSubmit = async () => {
    if (!validateResponse(userWriting, selectedWords)) {
      setFeedback({
        feedback: 'Please use at least a few of the vocabulary words in your writing.',
        score: 0,
        wordsFound: [],
      });
      return;
    }

    if (wordCount < 50) {
      setFeedback({
        feedback: 'Please write at least 50 words to properly demonstrate vocabulary usage.',
        score: 0,
        wordsFound: [],
      });
      return;
    }

    const fbk = await generateFeedback(userWriting, selectedWords);
    setFeedback(fbk);

    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader title="Writing Practice" subtitle="Write naturally with current and previous day vocabulary" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Loading words...</div>
              <div className="text-muted-foreground">Preparing your writing challenge</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Writing Brief</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Daily-life focused prompt using current day words and useful previous-day mixes.
              </p>
              <div className="rounded-md border border-border/50 bg-background/60 p-4 whitespace-pre-line text-sm text-foreground leading-relaxed">
                {writingBrief}
              </div>
              {providerLabel && (
                <p className="text-xs text-muted-foreground mt-3">Provider: {providerLabel}</p>
              )}
              {generationWarning && (
                <p className="text-xs text-amber-600 mt-2">{generationWarning}</p>
              )}
            </div>

            <WritingDisplay words={selectedWords} />

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4">
                <h3 className="font-bold text-foreground mb-2">Your Writing</h3>
                <p className="text-sm text-muted-foreground">
                  Write at least 50 words incorporating the vocabulary words above in a clear, natural way.
                </p>
              </div>

              <textarea
                value={userWriting}
                onChange={(e) => handleWritingChange(e.target.value)}
                disabled={submitted}
                placeholder="Start writing here... Use the vocabulary words naturally in your own writing."
                className="w-full rounded-lg border border-border bg-background text-foreground p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                rows={8}
              />

              <div className="flex items-center justify-between mt-4">
                <span className={`text-sm font-semibold ${wordCount >= 50 ? 'text-accent' : 'text-muted-foreground'}`}>
                  {wordCount} words
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitted || userWriting.trim().length === 0 || wordCount < 50}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitted ? 'Writing Submitted' : 'Submit Writing'}
                </button>
              </div>
            </div>

            {feedback && (
              <div className={`rounded-lg border-2 p-6 ${feedback.score >= 80 ? 'border-accent bg-accent/5' : 'border-primary bg-primary/5'}`}>
                <p className="font-bold text-foreground mb-2">{feedback.feedback}</p>
                <p className="text-sm text-muted-foreground mb-3">Score: {Math.round(feedback.score)}%</p>
                {feedback.wordsFound.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Vocabulary words you used:</p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.wordsFound.map((word) => (
                        <span key={word} className="inline-block bg-accent/20 text-accent rounded px-3 py-1 text-sm font-semibold">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {submitted && (
              <div className="rounded-lg border-2 border-accent bg-accent/5 p-6 text-center">
                <p className="text-lg font-semibold text-foreground">Excellent work! Writing submitted</p>
                <p className="text-muted-foreground text-sm mt-2">
                  You&apos;ve completed this writing practice.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="writing" />
    </div>
  );
}

function pickUsedWords(allWords: Word[], usedWords: string[]): Word[] {
  if (!usedWords.length) return allWords;

  const usedSet = new Set(usedWords.map((word) => word.toLowerCase()));
  const filtered = allWords.filter((word) => usedSet.has(word.word.toLowerCase()));
  return filtered.length > 0 ? filtered : allWords;
}
