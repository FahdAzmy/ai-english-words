'use client';

import { useState } from 'react';
import { createWord } from '@/lib/db/mock';
import { Word } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface AddWordDialogProps {
  dayId: string;
  isOpen: boolean;
  onClose: () => void;
  onWordAdded?: (word: Word) => void;
}

export default function AddWordDialog({
  dayId,
  isOpen,
  onClose,
  onWordAdded,
}: AddWordDialogProps) {
  const [english, setEnglish] = useState('');
  const [arabic, setArabic] = useState('');
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !arabic.trim()) return;

    setLoading(true);
    try {
      const newWord = await createWord(
        dayId,
        english.trim(),
        arabic.trim(),
        sentence.trim()
      );
      onWordAdded?.(newWord);
      setEnglish('');
      setArabic('');
      setSentence('');
      onClose();
    } catch (error) {
      console.error('Failed to add word:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/40 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Add Word</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm">Add one English word with its Arabic translation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              English
            </label>
            <Input
              type="text"
              placeholder="Enter English word"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="bg-muted/50 border-border/40 focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Arabic
            </label>
            <Input
              type="text"
              placeholder="Enter Arabic translation"
              value={arabic}
              onChange={(e) => setArabic(e.target.value)}
              className="bg-muted/50 border-border/40 focus:border-primary transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Sentence (optional)
            </label>
            <textarea
              placeholder="Enter a full sentence"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              className="w-full p-3 rounded-lg bg-muted/50 border border-border/40 focus:border-primary outline-none transition-colors text-sm min-h-24 resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !english.trim() || !arabic.trim()}
            >
              {loading ? 'Adding...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
