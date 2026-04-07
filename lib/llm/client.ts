import type { GenerateStoryInput, GenerateStoryOutput } from '@/lib/llm/story-generator';
import type {
  GeneratePracticeInput,
  GeneratePracticeOutput,
} from '@/lib/llm/practice-generator';
import type {
  GenerateDailySentenceInput,
  GenerateDailySentenceOutput,
} from '@/lib/llm/daily-sentence';
import type {
  SentenceExamRequest,
  SentenceExamResponse,
} from '@/lib/llm/sentence-exam';

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

export async function requestDailySentenceGeneration(
  input: GenerateDailySentenceInput
): Promise<GenerateDailySentenceOutput> {
  const response = await fetch('/api/llm/daily-sentence', {
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
        : 'Failed to generate daily sentences.'
    );
  }

  return payload as GenerateDailySentenceOutput;
}

export async function requestSentenceExam(
  input: SentenceExamRequest
): Promise<SentenceExamResponse> {
  const response = await fetch('/api/llm/sentence-exam', {
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
        : 'Failed to examine sentences.'
    );
  }

  return payload as SentenceExamResponse;
}
