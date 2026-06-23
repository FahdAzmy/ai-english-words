'use client';

import { useMemo, useRef, useState } from 'react';
import { createWord } from '@/lib/db/mock';
import { Word } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Upload, X } from 'lucide-react';

interface ImportPdfDialogProps {
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

export default function ImportPdfDialog({
  dayId,
  isOpen,
  onClose,
  onWordsAdded,
}: ImportPdfDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');

  const parsedPairs = useMemo(() => parseBulkInput(bulkText), [bulkText]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setBulkText('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);
      setBulkText(text);
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      setBulkText('Error: Could not extract text from this PDF.');
    } finally {
      setParsing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      setFileName('');
      onClose();
    } catch (error) {
      console.error('Failed to add words from PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBulkText('');
    setFileName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full border border-border/40 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Import Words from PDF</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm">
            Upload a PDF, review the extracted text, then submit.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!fileName && !parsing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border/50 p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Click to select a PDF file
              </p>
            </button>
          )}

          {parsing && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing PDF...</p>
            </div>
          )}

          {fileName && !parsing && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 border border-border/40">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                Change
              </Button>
            </div>
          )}

          {bulkText && !parsing && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Extracted Text
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full p-3 rounded-lg bg-muted/50 border border-border/40 focus:border-primary outline-none transition-colors text-sm min-h-56 resize-y font-mono"
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
                  onClick={handleClose}
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
                  {loading ? 'Adding...' : 'Import Words'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}
