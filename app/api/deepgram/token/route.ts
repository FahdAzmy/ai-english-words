import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface GrantTokenResponse {
  access_token?: string;
  expires_in?: number;
  err_msg?: string;
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

    const body = (await request.json().catch(() => ({}))) as {
      ttlSeconds?: number;
    };

    const ttlFromClient = Number(body?.ttlSeconds);
    const ttlSeconds = Number.isFinite(ttlFromClient)
      ? Math.min(3600, Math.max(20, Math.round(ttlFromClient)))
      : 60;

    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl_seconds: ttlSeconds }),
    });

    const payload = (await response.json()) as GrantTokenResponse;

    if (!response.ok || !payload.access_token) {
      const allowApiKeyFallback =
        process.env.DEEPGRAM_ALLOW_INSECURE_CLIENT_API_KEY === 'true';

      if (allowApiKeyFallback) {
        return NextResponse.json({
          accessToken: apiKey,
          expiresIn: null,
          tokenType: 'api_key',
          warning:
            'Using API key fallback for client websocket auth. For production, disable this and use temporary tokens.',
        });
      }

      return NextResponse.json(
        {
          error:
            payload.err_msg ||
            'Failed to generate Deepgram temporary token. Your API key may not have permission to grant temporary tokens.',
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in || ttlSeconds,
      tokenType: 'temporary_token',
    });
  } catch (error) {
    console.error('[v0] Deepgram token generation failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error generating Deepgram token.',
      },
      { status: 500 }
    );
  }
}
