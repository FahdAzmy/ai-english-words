'use client';

import { type DifficultyLevel } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StoryDifficultySliderProps {
  selectedDifficulty: DifficultyLevel;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  className?: string;
}

const difficulties: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: 'A2', label: 'A2', color: 'bg-green-500' },
  { value: 'B1', label: 'B1', color: 'bg-blue-500' },
  { value: 'B2', label: 'B2', color: 'bg-orange-500' },
  { value: 'C1', label: 'C1', color: 'bg-red-500' },
];

export default function StoryDifficultySlider({
  selectedDifficulty,
  onDifficultyChange,
  className,
}: StoryDifficultySliderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
      <div className="flex gap-2">
        {difficulties.map((diff) => (
          <button
            key={diff.value}
            type="button"
            onClick={() => onDifficultyChange(diff.value)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all',
              selectedDifficulty === diff.value
                ? `border-transparent ${diff.color} text-white shadow-lg scale-110`
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:scale-105'
            )}
            title={diff.label}
          >
            {diff.label}
          </button>
        ))}
      </div>
    </div>
  );
}
