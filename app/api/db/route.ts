import { NextResponse } from 'next/server';
import {
  createDayRepo,
  createWordRepo,
  getCurrentUserRepo,
  getDayWordsRepo,
  getUserDaysRepo,
  updateWordUsageRepo,
} from '@/lib/db/repository';

export const runtime = 'nodejs';

type DBAction =
  | 'getCurrentUser'
  | 'getUserDays'
  | 'getDayWords'
  | 'createDay'
  | 'createWord'
  | 'updateWordUsage';

interface DBRequestBody {
  action: DBAction;
  payload?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DBRequestBody;
    const action = body?.action;
    const payload = body?.payload || {};

    if (!action) {
      return NextResponse.json({ error: 'Missing action.' }, { status: 400 });
    }

    switch (action) {
      case 'getCurrentUser': {
        const data = await getCurrentUserRepo();
        return NextResponse.json({ data });
      }

      case 'getUserDays': {
        const userId = String(payload.userId || '');
        if (!userId) {
          return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
        }
        const data = await getUserDaysRepo(userId);
        return NextResponse.json({ data });
      }

      case 'getDayWords': {
        const dayId = String(payload.dayId || '');
        if (!dayId) {
          return NextResponse.json({ error: 'Missing dayId.' }, { status: 400 });
        }
        const data = await getDayWordsRepo(dayId);
        return NextResponse.json({ data });
      }

      case 'createDay': {
        const userId = String(payload.userId || '');
        const dayNumber = Number(payload.dayNumber);
        if (!userId || Number.isNaN(dayNumber)) {
          return NextResponse.json(
            { error: 'Missing or invalid userId/dayNumber.' },
            { status: 400 }
          );
        }
        const data = await createDayRepo(userId, dayNumber);
        return NextResponse.json({ data });
      }

      case 'createWord': {
        const dayId = String(payload.dayId || '');
        const word = String(payload.word || '').trim();
        const definition = String(payload.definition || '').trim();
        const sentence = String(payload.sentence || '').trim();
        if (!dayId || !word || !definition) {
          return NextResponse.json(
            { error: 'Missing dayId/word/definition.' },
            { status: 400 }
          );
        }
        const data = await createWordRepo(dayId, word, definition, sentence);
        return NextResponse.json({ data });
      }

      case 'updateWordUsage': {
        const wordId = String(payload.wordId || '');
        if (!wordId) {
          return NextResponse.json({ error: 'Missing wordId.' }, { status: 400 });
        }
        const data = await updateWordUsageRepo(wordId);
        return NextResponse.json({ data });
      }

      default:
        return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[v0] DB API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown database error.',
      },
      { status: 500 }
    );
  }
}
