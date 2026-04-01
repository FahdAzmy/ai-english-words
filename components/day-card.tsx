'use client';

import Link from 'next/link';
import { Day } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface DayCardProps {
  day: Day;
}

export default function DayCard({ day }: DayCardProps) {
  return (
    <Link href={`/day/${day.id}`}>
      <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors h-full">
        <h3 className="text-2xl font-bold text-foreground">Day {day.day_number}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Created {new Date(day.created_at).toLocaleDateString('en-US')}
        </p>
        <Button className="mt-5 w-full">Open Day</Button>
      </div>
    </Link>
  );
}
