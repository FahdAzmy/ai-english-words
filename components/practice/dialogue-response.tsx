'use client';

interface DialogueResponseProps {
  response: string;
  onResponseChange: (response: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export default function DialogueResponse({
  response,
  onResponseChange,
  onSubmit,
  disabled,
}: DialogueResponseProps) {
  return (
    <div className="space-y-4">
      <textarea
        value={response}
        onChange={(e) => onResponseChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your response here..."
        className="w-full rounded-lg border border-border bg-background text-foreground p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        rows={4}
      />
      <div className="flex gap-4">
        <button
          onClick={onSubmit}
          disabled={disabled || response.trim().length === 0}
          className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Response Submitted' : 'Submit Response'}
        </button>
      </div>
    </div>
  );
}
