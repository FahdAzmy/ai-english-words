import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface DeepgramAlternative {
  transcript?: string;
  confidence?: number;
  words?: Array<{ start?: number; end?: number; word?: string }>;
}

interface DeepgramResponse {
  error?: string;
  metadata?: {
    duration?: number;
  };
  results?: {
    channels?: Array<{
      alternatives?: DeepgramAlternative[];
    }>;
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DEEPGRAM_API_KEY on server.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Missing audio file in form data.' },
        { status: 400 }
      );
    }

    const model = String(formData.get('model') || 'nova-3');
    const language = String(formData.get('language') || 'en');

    const params = new URLSearchParams({
      model,
      language,
      punctuate: 'true',
      smart_format: 'true',
      filler_words: 'true',
    });

    const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': audio.type || 'audio/webm',
      },
      body: Buffer.from(await audio.arrayBuffer()),
    });

    const payload = (await response.json()) as DeepgramResponse;

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error || 'Deepgram transcription request failed.' },
        { status: response.status }
      );
    }

    const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alternative?.transcript?.trim() || '';
    const confidence =
      typeof alternative?.confidence === 'number' ? alternative.confidence : null;

    const words = alternative?.words || [];
    const durationFromWords =
      words.length > 0 && typeof words[words.length - 1]?.end === 'number'
        ? words[words.length - 1].end || null
        : null;

    const durationFromMetadata =
      typeof payload.metadata?.duration === 'number' ? payload.metadata.duration : null;

    return NextResponse.json({
      transcript,
      confidence,
      durationSeconds: durationFromMetadata ?? durationFromWords,
    });
  } catch (error) {
    console.error('[v0] Deepgram transcription failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while transcribing audio.',
      },
      { status: 500 }
    );
  }
}
