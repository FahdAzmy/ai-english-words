import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PracticeFooterProps {
  dayId: string;
  currentMode: 'story' | 'sentences' | 'sentence-exam' | 'dialogue' | 'writing' | 'speaking' | 'music';
}

const modes = ['story', 'sentences', 'sentence-exam', 'dialogue', 'writing', 'speaking', 'music'];

export default function PracticeFooter({ dayId, currentMode }: PracticeFooterProps) {
  const currentIndex = modes.indexOf(currentMode);
  const nextMode = modes[currentIndex + 1];
  const prevMode = modes[currentIndex - 1];

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 gap-4">
          {prevMode ? (
            <Link href={`/day/${dayId}/practice/${prevMode}`}>
              <Button variant="outline" className="w-full">
                ← Previous Mode
              </Button>
            </Link>
          ) : (
            <Link href={`/day/${dayId}`}>
              <Button variant="outline" className="w-full">
                ← Back to Day
              </Button>
            </Link>
          )}

          {nextMode ? (
            <Link href={`/day/${dayId}/practice/${nextMode}`}>
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                Next Mode →
              </Button>
            </Link>
          ) : (
            <Link href={`/day/${dayId}`}>
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
                Finish →
              </Button>
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
