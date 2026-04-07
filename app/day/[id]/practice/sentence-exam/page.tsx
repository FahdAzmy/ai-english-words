'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Word } from '@/lib/types';
import { updateWordUsage } from '@/lib/db/mock';
import { requestSentenceExam } from '@/lib/llm/client';
import { type SentenceExamItem, type SentenceExamResponse } from '@/lib/llm/sentence-exam';
import { buildPracticeWordContext } from '@/lib/services/practice-context';
import PracticeHeader from '@/components/practice-header';
import PracticeFooter from '@/components/practice-footer';

export default function SentenceExamPage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [loadingError, setLoadingError] = useState('');

  const [userSentences, setUserSentences] = useState<Record<string, string>>({});
  const [singleReviews, setSingleReviews] = useState<Record<string, SentenceExamItem>>({});
  const [singleReviewErrors, setSingleReviewErrors] = useState<Record<string, string>>({});
  const [checkingWordId, setCheckingWordId] = useState<string | null>(null);

  const [finalReview, setFinalReview] = useState<SentenceExamResponse | null>(null);
  const [reviewAllLoading, setReviewAllLoading] = useState(false);
  const [reviewAllError, setReviewAllError] = useState('');
  const [reviewProviderLabel, setReviewProviderLabel] = useState('');
  const [currentDayNumber, setCurrentDayNumber] = useState<number | null>(null);

  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      setLoadingError('');

      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 5 });
        const words = context.words;

        setCurrentDayNumber(context.currentDayNumber);

        if (words.length === 0) {
          setSelectedWords([]);
          setUserSentences({});
          setLoadingError('No vocabulary words were found for this day.');
          return;
        }

        setSelectedWords(words);
        setUserSentences(buildSentenceInputState(words));
      } catch (error) {
        console.error('[v0] Failed to load sentence exam words:', error);
        setSelectedWords([]);
        setUserSentences({});
        setLoadingError('Failed to load sentence exam words.');
      } finally {
        setLoading(false);
      }
    }

    loadWords();
  }, [dayId]);

  const allSentencesReady =
    selectedWords.length > 0 &&
    selectedWords.every((word) => (userSentences[word.id] || '').trim().length > 0);

  const handleSentenceInputChange = (wordId: string, value: string) => {
    setUserSentences((current) => ({
      ...current,
      [wordId]: value,
    }));

    setSingleReviews((current) => {
      if (!current[wordId]) return current;
      const next = { ...current };
      delete next[wordId];
      return next;
    });

    setSingleReviewErrors((current) => {
      if (!current[wordId]) return current;
      const next = { ...current };
      delete next[wordId];
      return next;
    });

    setFinalReview(null);
    setReviewAllError('');
  };

  const handleCheckSingleSentence = async (word: Word) => {
    const sentence = (userSentences[word.id] || '').trim();

    if (!sentence) {
      setSingleReviewErrors((current) => ({
        ...current,
        [word.id]: 'Please write a sentence first.',
      }));
      return;
    }

    setCheckingWordId(word.id);
    setSingleReviewErrors((current) => {
      const next = { ...current };
      delete next[word.id];
      return next;
    });

    try {
      const review = await requestSentenceExam({
        mode: 'single',
        dayId,
        currentDayNumber: currentDayNumber || undefined,
        sentences: [
          {
            word: word.word,
            definition: word.definition,
            sentence,
          },
        ],
      });

      const reviewItem = review.results[0];
      if (reviewItem) {
        setSingleReviews((current) => ({
          ...current,
          [word.id]: reviewItem,
        }));
      }

      setReviewProviderLabel(`${review.provider} / ${review.model}`);
    } catch (error) {
      setSingleReviewErrors((current) => ({
        ...current,
        [word.id]:
          error instanceof Error ? error.message : 'Failed to review this sentence.',
      }));
    } finally {
      setCheckingWordId(null);
    }
  };

  const handleReviewAll = async () => {
    if (!allSentencesReady) {
      setReviewAllError('Write one sentence for each word before running full review.');
      return;
    }

    setReviewAllLoading(true);
    setReviewAllError('');

    try {
      const review = await requestSentenceExam({
        mode: 'batch',
        dayId,
        currentDayNumber: currentDayNumber || undefined,
        sentences: selectedWords.map((word) => ({
          word: word.word,
          definition: word.definition,
          sentence: (userSentences[word.id] || '').trim(),
        })),
      });

      setFinalReview(review);
      setReviewProviderLabel(`${review.provider} / ${review.model}`);

      const mappedSingle: Record<string, SentenceExamItem> = {};
      selectedWords.forEach((word, index) => {
        const item = review.results[index];
        if (item) {
          mappedSingle[word.id] = item;
        }
      });

      setSingleReviews((current) => ({
        ...current,
        ...mappedSingle,
      }));
    } catch (error) {
      setReviewAllError(
        error instanceof Error ? error.message : 'Failed to review all sentences.'
      );
    } finally {
      setReviewAllLoading(false);
    }
  };

  const handleComplete = async () => {
    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader title="Sentence Exam" subtitle="Write one sentence per word and get AI feedback" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Loading exam...</div>
              <div className="text-muted-foreground">Preparing your sentence exam words</div>
            </div>
          </div>
        ) : loadingError ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-amber-600">{loadingError}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Sentence Exam</h2>
              <p className="text-sm text-muted-foreground">
                For each target word, write one full sentence and check it. Then run full review to get repeated weak points.
              </p>
              {reviewProviderLabel && (
                <p className="text-xs text-muted-foreground mt-2">Review Provider: {reviewProviderLabel}</p>
              )}
            </div>

            <div className="space-y-4">
              {selectedWords.map((word, index) => {
                const review = singleReviews[word.id];
                const reviewError = singleReviewErrors[word.id];
                const isChecking = checkingWordId === word.id;

                return (
                  <div key={word.id} className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-foreground">
                        {index + 1}. {word.word}
                      </p>
                      <p className="text-xs text-muted-foreground">{word.definition}</p>
                    </div>

                    <textarea
                      value={userSentences[word.id] || ''}
                      onChange={(event) => handleSentenceInputChange(word.id, event.target.value)}
                      placeholder={`Write one full sentence using "${word.word}"`}
                      className="w-full rounded-lg border border-border bg-background text-foreground p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y min-h-20"
                      rows={3}
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => void handleCheckSingleSentence(word)}
                        disabled={isChecking || !(userSentences[word.id] || '').trim()}
                        className="bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isChecking ? 'Checking...' : 'Check This Sentence'}
                      </button>

                      {review ? (
                        <p className="text-sm text-muted-foreground">Score: {review.score}%</p>
                      ) : null}
                    </div>

                    {reviewError && (
                      <p className="text-xs text-red-600">{reviewError}</p>
                    )}

                    {review && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                        <p className="text-sm text-foreground">{review.feedback}</p>
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">Better sentence:</span> {review.betterSentence}
                        </p>
                        {review.weakPoints.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {review.weakPoints.map((weakPoint) => (
                              <span
                                key={`${word.id}_${weakPoint}`}
                                className="inline-block rounded-full border border-primary/30 bg-background px-3 py-1 text-xs text-foreground"
                              >
                                {weakPoint}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-border/70 bg-card/60 p-4 space-y-3">
              <button
                type="button"
                onClick={() => void handleReviewAll()}
                disabled={reviewAllLoading || !allSentencesReady || selectedWords.length === 0}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewAllLoading ? 'Reviewing all sentences...' : 'Review All Sentences'}
              </button>
              {!allSentencesReady && selectedWords.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Complete all sentence inputs first, then run full review.
                </p>
              )}
              {reviewAllError && (
                <p className="text-xs text-red-600">{reviewAllError}</p>
              )}
            </div>

            {finalReview && (
              <div className="rounded-lg border-2 border-accent bg-accent/5 p-6 space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Final Review</h3>
                  <p className="text-sm text-foreground">{finalReview.overall.generalFeedback}</p>
                </div>

                {finalReview.overall.repeatedWeakPoints.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Repeated weak points</p>
                    <div className="flex flex-wrap gap-2">
                      {finalReview.overall.repeatedWeakPoints.map((weakPoint) => (
                        <span
                          key={`overall_${weakPoint}`}
                          className="inline-block rounded-full border border-accent/40 bg-background px-3 py-1 text-xs text-foreground"
                        >
                          {weakPoint}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {finalReview.overall.nextSteps.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">How to improve</p>
                    <div className="space-y-1">
                      {finalReview.overall.nextSteps.map((step, index) => (
                        <p key={`step_${index}`} className="text-sm text-muted-foreground">
                          {index + 1}. {step}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Feedback for each sentence</p>
                  {finalReview.results.map((result, index) => (
                    <div key={`${result.word}_${index}`} className="rounded-md border border-border bg-background p-3 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {index + 1}. {result.word} - Score: {result.score}%
                      </p>
                      <p className="text-sm text-foreground">{result.feedback}</p>
                      <p className="text-sm text-muted-foreground">
                        Better: {result.betterSentence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!completed && (
              <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
                <h3 className="font-bold text-foreground mb-2">Ready to continue?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  After reviewing your sentences, mark this exam as complete.
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
                <p className="text-lg font-semibold text-foreground">Great job! Sentence exam completed</p>
                <p className="text-muted-foreground text-sm mt-2">
                  You&apos;ve completed the sentence exam for {selectedWords.length} words.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="sentence-exam" />
    </div>
  );
}

function buildSentenceInputState(words: Word[]): Record<string, string> {
  return words.reduce<Record<string, string>>((accumulator, word) => {
    accumulator[word.id] = '';
    return accumulator;
  }, {});
}
