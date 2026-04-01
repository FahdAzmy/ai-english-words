'use client';

import { useMemo, useState } from 'react';
import { createWord } from '@/lib/db/mock';
import { Word } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AddWordsDialogProps {
  dayId: string;
  isOpen: boolean;
  onClose: () => void;
  onWordsAdded?: (words: Word[]) => void;
}

function parseBulkInput(input: string): Array<{ english: string; arabic: string; sentence?: string }> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const pairs: Array<{ english: string; arabic: string; sentence?: string }> = [];

  for (const line of lines) {
    const sentenceLine = line.match(/^(?:→|->)\s*(.+)$/);
    if (sentenceLine) {
      const sentence = sentenceLine[1]?.trim();
      if (sentence && pairs.length > 0) {
        const lastPair = pairs[pairs.length - 1];
        lastPair.sentence = lastPair.sentence
          ? `${lastPair.sentence} ${sentence}`
          : sentence;
      }
      continue;
    }

    const separators = ['\t', '|', ',', ' - ', ' – ', ' — ', ':'];
    let parts: string[] = [];

    for (const separator of separators) {
      if (line.includes(separator)) {
        parts = line.split(separator).map((value) => value.trim()).filter(Boolean);
        if (parts.length >= 2) {
          break;
        }
      }
    }

    if (parts.length >= 2) {
      const english = parts[0];
      const arabic = parts[1];
      const sentence = parts.slice(2).join(' ').trim();
      if (english && arabic) {
        pairs.push({ english, arabic, sentence: sentence || undefined });
      }
    }
  }

  return pairs;
}

export default function AddWordsDialog({
  dayId,
  isOpen,
  onClose,
  onWordsAdded,
}: AddWordsDialogProps) {
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedPairs = useMemo(() => parseBulkInput(bulkText), [bulkText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedPairs.length) return;

    setLoading(true);
    try {
      const createdWords = await Promise.all(
        parsedPairs.map((pair) =>
          createWord(dayId, pair.english, pair.arabic, pair.sentence)
        )
      );
      onWordsAdded?.(createdWords);
      setBulkText('');
      onClose();
    } catch (error) {
      console.error('Failed to add words in bulk:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full border border-border/40 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Add Words</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm">
            Paste using this format: english | arabic, then next line starts with →
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Words List
            </label>
            <textarea
              placeholder={"examining | فحص / تحليل\n→ She is examining the data\n\nbook | كتاب\n→ I bought a new book yesterday."}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full p-3 rounded-lg bg-muted/50 border border-border/40 focus:border-primary outline-none transition-colors text-sm min-h-56 resize-y"
              disabled={loading}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Parsed words: {parsedPairs.length}
          </p>

          <div className="flex gap-3 pt-2">
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
              disabled={loading || parsedPairs.length === 0}
            >
              {loading ? 'Adding...' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
