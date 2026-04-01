import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PracticeHeaderProps {
  title: string;
  subtitle: string;
}

export default function PracticeHeader({ title, subtitle }: PracticeHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
