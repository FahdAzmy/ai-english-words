'use client';

import { type StoryGenre } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StoryGenreSelectorProps {
  selectedGenre: StoryGenre;
  onGenreChange: (genre: StoryGenre) => void;
  className?: string;
}

const genres: { value: StoryGenre; label: string; icon: string }[] = [
  { value: 'daily-life', label: 'Daily Life', icon: '🏠' },
  { value: 'mystery', label: 'Mystery', icon: '🔍' },
  { value: 'comedy', label: 'Comedy', icon: '😄' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
];

export default function StoryGenreSelector({
  selectedGenre,
  onGenreChange,
  className,
}: StoryGenreSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {genres.map((genre) => (
        <button
          key={genre.value}
          type="button"
          onClick={() => onGenreChange(genre.value)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
            selectedGenre === genre.value
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          <span className="text-base">{genre.icon}</span>
          <span>{genre.label}</span>
        </button>
      ))}
    </div>
  );
}
