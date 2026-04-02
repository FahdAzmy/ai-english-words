'use client';

import { Word } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PracticeModeSelectorProps {
  dayId: string;
  words: Word[];
  suggestedMode: 'story' | 'sentences' | 'dialogue' | 'writing' | 'music';
}

const practiceModes = [
  {
    id: 'story',
    name: 'Story Generator',
    description:
      'Read an engaging story that naturally incorporates all your vocabulary words. Great for understanding context and usage.',
    icon: 'ST',
    color: 'from-blue-500 to-cyan-500',
    difficulty: 'Beginner',
  },
  {
    id: 'sentences',
    name: 'Daily Sentences',
    description:
      'Build meaningful sentences with your vocabulary words. Practice combining words in grammatically correct ways.',
    icon: 'SE',
    color: 'from-purple-500 to-pink-500',
    difficulty: 'Intermediate',
  },
  {
    id: 'dialogue',
    name: 'Interactive Dialogue',
    description:
      'Engage in a simulated conversation where you use your vocabulary words naturally. Learn through dialogue.',
    icon: 'DL',
    color: 'from-green-500 to-emerald-500',
    difficulty: 'Advanced',
  },
  {
    id: 'writing',
    name: 'Writing Practice',
    description: 'Create your own writing using all the vocabulary words. Challenge yourself with free-form writing.',
    icon: 'WR',
    color: 'from-orange-500 to-red-500',
    difficulty: 'Expert',
  },
  {
    id: 'music',
    name: 'Music Practice',
    description: 'Turn your day words into a catchy song and use repetition to remember vocabulary faster.',
    icon: 'MU',
    color: 'from-indigo-500 to-blue-500',
    difficulty: 'All Levels',
  },
];

export default function PracticeModeSelector({
  dayId,
  words,
  suggestedMode,
}: PracticeModeSelectorProps) {
  return (
    <div>
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">Choose Your Practice Mode</h2>
        <p className="text-base text-muted-foreground max-w-2xl">
          Select a learning style that works best for you. We recommend starting with{' '}
          <span className="inline-block bg-primary/20 px-2 py-1 rounded text-primary font-semibold">{suggestedMode}</span>{' '}
          based on your progress.
        </p>
      </div>

      <div className="grid gap-5">
        {practiceModes.map((mode) => {
          const isRecommended = mode.id === suggestedMode;
          return (
            <Link key={mode.id} href={`/day/${dayId}/practice/${mode.id}`}>
              <div
                className={`group relative rounded-2xl border bg-card p-6 sm:p-7 cursor-pointer transition-all duration-300 overflow-hidden ${
                  isRecommended
                    ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl hover:shadow-2xl'
                    : 'border-border/40 hover:border-primary/30 hover:shadow-lg backdrop-blur-sm'
                }`}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} rounded-full blur-3xl`} />
                </div>

                <div className="relative z-10 flex items-start gap-5 sm:gap-6">
                  <div className="text-3xl sm:text-4xl font-black leading-none flex-shrink-0 group-hover:scale-110 transition-transform">{mode.icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">{mode.name}</h3>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm sm:text-base mb-4 leading-relaxed">{mode.description}</p>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="inline-block text-xs font-bold text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1.5 rounded-lg uppercase tracking-wide">
                        {mode.difficulty}
                      </span>
                      <Button
                        className={`bg-gradient-to-r ${mode.color} text-white hover:shadow-lg transition-all font-semibold rounded-lg h-9 group-hover:gap-2 flex items-center justify-center gap-1`}
                        asChild
                      >
                        <span>Start Practice -&gt;</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 p-6 backdrop-blur-sm">
        <p className="text-sm text-foreground font-bold mb-2">Tip</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Each practice mode strengthens vocabulary in different ways. Try them all to find your preferred learning style,
          and mix it up to reinforce concepts from multiple angles.
        </p>
      </div>
    </div>
  );
}
