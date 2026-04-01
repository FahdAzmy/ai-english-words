'use client';

import { useEffect, useState } from 'react';
import { createDay, getCurrentUser, getUserDays } from '@/lib/db/mock';
import { Day, User } from '@/lib/types';
import DayCard from '@/components/day-card';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingDay, setAddingDay] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const userDays = await getUserDays(currentUser.id);
          const sortedDays = userDays.sort((a, b) => a.day_number - b.day_number);
          setDays(sortedDays);
        }
      } catch (error) {
        console.error('[v0] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddDay = async () => {
    if (!user) return;

    setAddingDay(true);
    try {
      const nextDayNumber =
        days.length > 0 ? Math.max(...days.map((day) => day.day_number)) + 1 : 1;
      const newDay = await createDay(user.id, nextDayNumber);
      setDays((currentDays) =>
        [...currentDays, newDay].sort((a, b) => a.day_number - b.day_number)
      );
    } catch (error) {
      console.error('[v0] Failed to create day:', error);
    } finally {
      setAddingDay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Loading days...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Days</h1>
          <Button onClick={handleAddDay} disabled={!user || addingDay}>
            {addingDay ? 'Adding Day...' : 'Add Day'}
          </Button>
        </div>

        {days.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.map((day) => (
              <DayCard key={day.id} day={day} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No days yet. Add your first day.</p>
        )}
      </main>
    </div>
  );
}
