'use client';

import { useEffect, useState } from 'react';
import { updateWord } from '@/lib/db/mock';
import { Word } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface EditWordDialogProps {
  word: Word | null;
  isOpen: boolean;
  onClose: () => void;
  onWordUpdated?: (word: Word) => void;
}

export default function EditWordDialog({
  word,
  isOpen,
  onClose,
  onWordUpdated,
}: EditWordDialogProps) {
  const [english, setEnglish] = useState('');
  const [arabic, setArabic] = useState('');
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!word || !isOpen) return;
    setEnglish(word.word);
    setArabic(word.definition);
    setSentence(word.example_sentence || '');
  }, [word, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !english.trim() || !arabic.trim()) return;

    setLoading(true);
    try {
      const updatedWord = await updateWord(
        word.id,
        english.trim(),
        arabic.trim(),
        sentence.trim()
      );
      onWordUpdated?.(updatedWord);
      onClose();
    } catch (error) {
      console.error('Failed to update word:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl">
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Edit Word</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 transition-colors hover:bg-white/20"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-white/80">Update the word and translation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">English</label>
            <Input
              type="text"
              placeholder="Enter English word"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="border-border/40 bg-muted/50 transition-colors focus:border-primary"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Arabic</label>
            <Input
              type="text"
              placeholder="Enter Arabic translation"
              value={arabic}
              onChange={(e) => setArabic(e.target.value)}
              className="border-border/40 bg-muted/50 transition-colors focus:border-primary"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Sentence (optional)</label>
            <textarea
              placeholder="Enter a full sentence"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              className="min-h-24 w-full resize-none rounded-lg border border-border/40 bg-muted/50 p-3 text-sm outline-none transition-colors focus:border-primary"
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
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
