import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This action was renamed. Use /api/llm/sentence-exam.' },
    { status: 410 }
  );
}
