'use client';

import { useEffect, useMemo, useState } from 'react';
import { Word } from '@/lib/types';

interface DialogueDisplayProps {
  dialogue: string;
  choiceWords: Word[];
  onComplete?: (result: DialogueQuizResult) => void;
}

interface DialogueQuestion {
  id: string;
  speaker: string;
  sentenceWithBlank: string;
  correctWord: string;
  options: string[];
}

interface AnswerState {
  selectedWord: string;
  isCorrect: boolean;
}

export interface DialogueQuizResult {
  totalCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  correctWords: string[];
}

export default function DialogueDisplay({
  dialogue,
  choiceWords,
  onComplete,
}: DialogueDisplayProps) {
  const questions = useMemo(
    () => buildDialogueQuestions(dialogue, choiceWords),
    [dialogue, choiceWords]
  );
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [completionReported, setCompletionReported] = useState(false);

  useEffect(() => {
    setAnswers({});
    setCompletionReported(false);
  }, [questions]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const correctCount = Object.values(answers).filter((answer) => answer.isCorrect).length;
  const incorrectCount = Math.max(0, answeredCount - correctCount);

  useEffect(() => {
    if (!onComplete || completionReported || totalCount === 0 || answeredCount !== totalCount) {
      return;
    }

    const correctWords = questions
      .filter((question) => answers[question.id]?.isCorrect)
      .map((question) => question.correctWord.toLowerCase());

    onComplete({
      totalCount,
      answeredCount,
      correctCount,
      incorrectCount,
      correctWords: Array.from(new Set(correctWords)),
    });
    setCompletionReported(true);
  }, [
    answeredCount,
    answers,
    completionReported,
    correctCount,
    incorrectCount,
    onComplete,
    questions,
    totalCount,
  ]);

  const handleChooseWord = (questionId: string, selectedWord: string, correctWord: string) => {
    setAnswers((prev) => {
      if (prev[questionId]) return prev;
      return {
        ...prev,
        [questionId]: {
          selectedWord,
          isCorrect: selectedWord.toLowerCase() === correctWord.toLowerCase(),
        },
      };
    });
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">
          No quiz blanks could be generated. Add day words and regenerate dialogue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-2xl font-bold text-foreground mb-2">Dialogue Fill-in Practice</h2>
        <p className="text-sm text-muted-foreground">
          Choose the correct day word for each blank.
        </p>
        <p className="text-sm text-foreground mt-3">
          Progress: {answeredCount}/{totalCount} | Correct: {correctCount} | Wrong: {incorrectCount}
        </p>
      </div>

      {questions.map((question, index) => {
        const answer = answers[question.id];
        const isAnswered = Boolean(answer);

        return (
          <div
            key={question.id}
            className="p-4 rounded-lg border border-primary/20 bg-primary/5"
          >
            {question.speaker && (
              <p className="font-semibold mb-2 text-primary">{question.speaker}:</p>
            )}
            <p className="text-foreground leading-relaxed font-medium mb-4">
              {index + 1}. {question.sentenceWithBlank}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options.map((option) => {
                const isOptionCorrect = option.toLowerCase() === question.correctWord.toLowerCase();
                const isSelectedOption =
                  answer?.selectedWord.toLowerCase() === option.toLowerCase();

                const buttonClass = !isAnswered
                  ? 'border-border hover:border-primary/60 hover:bg-primary/5'
                  : isOptionCorrect
                    ? 'border-green-500/50 bg-green-500/10 text-green-700'
                    : isSelectedOption
                      ? 'border-red-500/50 bg-red-500/10 text-red-700'
                      : 'border-border/60 text-muted-foreground';

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      handleChooseWord(question.id, option, question.correctWord)
                    }
                    disabled={isAnswered}
                    className={`rounded-lg border px-4 py-2 text-left transition-colors disabled:cursor-not-allowed ${buttonClass}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {answer && (
              <p
                className={`mt-3 text-sm font-semibold ${
                  answer.isCorrect ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {answer.isCorrect
                  ? 'Correct choice.'
                  : `Not correct. Right answer: ${question.correctWord}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildDialogueQuestions(dialogue: string, choiceWords: Word[]): DialogueQuestion[] {
  const uniqueChoiceWords = getUniqueWordList(choiceWords);
  if (uniqueChoiceWords.length === 0) return [];

  let lines = dialogue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    lines = dialogue
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const questions: DialogueQuestion[] = [];

  lines.forEach((line, index) => {
    const { speaker, sentence } = parseDialogueLine(line);
    const match = findBestWordMatch(sentence, uniqueChoiceWords);
    if (!match) return;

    const sentenceWithBlank =
      sentence.slice(0, match.index) + '________' + sentence.slice(match.index + match.length);
    const options = buildOptions(match.word, uniqueChoiceWords);

    questions.push({
      id: `${index}-${match.word.toLowerCase()}`,
      speaker,
      sentenceWithBlank,
      correctWord: match.word,
      options,
    });
  });

  if (questions.length > 0) return questions;

  return buildFallbackQuestions(uniqueChoiceWords);
}

function parseDialogueLine(line: string): { speaker: string; sentence: string } {
  const match = line.match(/^([^:]{1,20}):\s*(.+)$/);
  if (!match) return { speaker: '', sentence: line };
  return {
    speaker: match[1].trim(),
    sentence: match[2].trim(),
  };
}

function findBestWordMatch(
  sentence: string,
  words: string[]
): { word: string; index: number; length: number } | null {
  let bestMatch: { word: string; index: number; length: number } | null = null;

  words.forEach((word) => {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    const match = pattern.exec(sentence);
    if (!match || typeof match.index !== 'number') return;

    if (!bestMatch || match.index < bestMatch.index) {
      bestMatch = {
        word,
        index: match.index,
        length: match[0].length,
      };
    }
  });

  return bestMatch;
}

function buildOptions(correctWord: string, words: string[]): string[] {
  const distractors = shuffleArray(
    words.filter((word) => word.toLowerCase() !== correctWord.toLowerCase())
  ).slice(0, 3);

  return shuffleArray([correctWord, ...distractors]);
}

function buildFallbackQuestions(words: string[]): DialogueQuestion[] {
  return words.slice(0, 8).map((word, index) => {
    const sentence = `I want to use ${word} in a real conversation today.`;
    return {
      id: `fallback-${index}`,
      speaker: index % 2 === 0 ? 'A' : 'B',
      sentenceWithBlank: sentence.replace(word, '________'),
      correctWord: word,
      options: buildOptions(word, words),
    };
  });
}

function getUniqueWordList(words: Word[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  words.forEach((word) => {
    const normalized = word.word.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(word.word.trim());
  });

  return unique;
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
