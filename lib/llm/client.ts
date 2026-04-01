import type { GenerateStoryInput, GenerateStoryOutput } from '@/lib/llm/story-generator';
import type {
  GeneratePracticeInput,
  GeneratePracticeOutput,
} from '@/lib/llm/practice-generator';

export async function requestStoryGeneration(
  input: GenerateStoryInput
): Promise<GenerateStoryOutput> {
  const response = await fetch('/api/llm/story', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Failed to generate story from LLM.'
    );
  }

  return payload as GenerateStoryOutput;
}

export async function requestPracticeGeneration(
  input: GeneratePracticeInput
): Promise<GeneratePracticeOutput> {
  const response = await fetch('/api/llm/practice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Failed to generate practice content from LLM.'
    );
  }

  return payload as GeneratePracticeOutput;
}
