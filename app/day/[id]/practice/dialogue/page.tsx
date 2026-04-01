'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Word } from '@/lib/types';
import { updateWordUsage } from '@/lib/db/mock';
import { generateLLMResponse, generateFeedback, validateResponse } from '@/lib/llm';
import { requestPracticeGeneration } from '@/lib/llm/client';
import { type PracticeVocabularyWord } from '@/lib/llm/practice-generator';
import { buildPracticeWordContext } from '@/lib/services/practice-context';
import PracticeHeader from '@/components/practice-header';
import DialogueDisplay from '@/components/practice/dialogue-display';
import DialogueResponse from '@/components/practice/dialogue-response';
import PracticeFooter from '@/components/practice-footer';

type FeedbackResult = Awaited<ReturnType<typeof generateFeedback>>;

export default function DialoguePracticePage() {
  const params = useParams();
  const dayId = params.id as string;

  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [dialogue, setDialogue] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [providerLabel, setProviderLabel] = useState('');
  const [generationWarning, setGenerationWarning] = useState('');

  useEffect(() => {
    async function loadAndGenerate() {
      try {
        const context = await buildPracticeWordContext(dayId, { previousWordsPerDay: 5 });
        const allWords = context.words;

        if (allWords.length === 0) {
          setSelectedWords([]);
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
          });

          setDialogue(generated.text);
          setSelectedWords(pickUsedWords(allWords, generated.wordsUsed));
          setProviderLabel(`${generated.provider} / ${generated.model}`);
          setGenerationWarning('');
        } catch (generationError) {
          console.error('[v0] Dialogue LLM provider call failed, using fallback:', generationError);
          const fallback = await generateLLMResponse('dialogue', allWords);
          setDialogue(fallback.text);
          setSelectedWords(pickUsedWords(allWords, fallback.wordsUsed));
          setProviderLabel('local fallback');
          setGenerationWarning(
            'LLM provider was not reachable. Using local fallback dialogue until provider env is configured.'
          );
        }
      } catch (error) {
        console.error('[v0] Failed to load dialogue:', error);
        setDialogue('A: Sorry, dialogue generation is unavailable right now.\nB: Please try again in a moment.');
        setGenerationWarning('Failed to load dialogue practice.');
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerate();
  }, [dayId]);

  const handleSubmit = async () => {
    if (!validateResponse(userResponse, selectedWords)) {
      setFeedback({
        feedback: 'Please use at least a few of the vocabulary words in your response.',
        score: 0,
        wordsFound: [],
      });
      return;
    }

    const fbk = await generateFeedback(userResponse, selectedWords);
    setFeedback(fbk);

    await Promise.all(selectedWords.map((word) => updateWordUsage(word.id)));

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PracticeHeader title="Interactive Dialogue" subtitle="Practice daily-life conversation using mixed vocabulary" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">Loading dialogue...</div>
              <div className="text-muted-foreground">Generating a practical conversation scenario</div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Current day words are required; previous day words are mixed only when natural and useful.
              </p>
              {providerLabel && (
                <p className="text-xs text-muted-foreground mt-2">Provider: {providerLabel}</p>
              )}
              {generationWarning && (
                <p className="text-xs text-amber-600 mt-2">{generationWarning}</p>
              )}
            </div>

            <DialogueDisplay dialogue={dialogue} words={selectedWords} />

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Your Response</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Continue the dialogue using as many vocabulary words as possible.
              </p>
              <DialogueResponse
                response={userResponse}
                onResponseChange={setUserResponse}
                onSubmit={handleSubmit}
                disabled={submitted}
              />
            </div>

            {feedback && (
              <div className={`rounded-lg border-2 p-6 ${feedback.score >= 80 ? 'border-accent bg-accent/5' : 'border-primary bg-primary/5'}`}>
                <p className="font-bold text-foreground mb-2">{feedback.feedback}</p>
                <p className="text-sm text-muted-foreground mb-3">Score: {Math.round(feedback.score)}%</p>
                {feedback.wordsFound.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Words you used:</p>
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

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-bold text-foreground mb-4">Vocabulary in this dialogue:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedWords.map((word) => (
                  <div key={word.id} className="rounded bg-green-500/5 border border-green-500/20 p-4">
                    <p className="font-semibold text-green-600">{word.word}</p>
                    <p className="text-sm text-muted-foreground mt-1">{word.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <PracticeFooter dayId={dayId} currentMode="dialogue" />
    </div>
  );
}

function pickUsedWords(allWords: Word[], usedWords: string[]): Word[] {
  if (!usedWords.length) return allWords;

  const usedSet = new Set(usedWords.map((word) => word.toLowerCase()));
  const filtered = allWords.filter((word) => usedSet.has(word.word.toLowerCase()));
  return filtered.length > 0 ? filtered : allWords;
}
