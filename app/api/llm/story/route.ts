import { NextResponse } from "next/server";
import {
  buildStoryPrompts,
  extractUsedWords,
  type GenerateStoryInput,
} from "@/lib/llm/story-generator";
import { generateTextWithConfiguredProvider } from "@/lib/llm/providers";
import type { StoryGenre, DifficultyLevel } from "@/lib/types";

interface ExtendedStoryInput extends GenerateStoryInput {
  genre?: StoryGenre;
  difficulty?: DifficultyLevel;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ExtendedStoryInput>;

    if (!body || !Array.isArray(body.words) || body.words.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. "words" must be a non-empty array.' },
        { status: 400 },
      );
    }

    if (typeof body.currentDayNumber !== "number") {
      return NextResponse.json(
        { error: 'Invalid request body. "currentDayNumber" must be a number.' },
        { status: 400 },
      );
    }

    const validGenres: StoryGenre[] = [
      "mystery",
      "comedy",
      "business",
      "travel",
      "daily-life",
    ];
    const validDifficulties: DifficultyLevel[] = ["A2", "B1", "B2", "C1"];

    if (body.genre && !validGenres.includes(body.genre)) {
      return NextResponse.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(", ")}.` },
        { status: 400 },
      );
    }

    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
      return NextResponse.json(
        {
          error: `Invalid difficulty. Must be one of: ${validDifficulties.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const normalizedInput: ExtendedStoryInput = {
      dayId: body.dayId || "unknown_day",
      currentDayNumber: body.currentDayNumber,
      words: body.words
        .map((word) => ({
          word: word.word?.trim() || "",
          definition: word.definition?.trim() || "",
          sourceDayNumber:
            Number(word.sourceDayNumber) || body.currentDayNumber || 1,
          isCurrentDay: Boolean(word.isCurrentDay),
        }))
        .filter((word) => word.word.length > 0),
      genre: body.genre,
      difficulty: body.difficulty,
    };

    if (normalizedInput.words.length === 0) {
      return NextResponse.json(
        { error: "No valid words were provided." },
        { status: 400 },
      );
    }

    const prompts = buildStoryPrompts(normalizedInput);
    const generated = await generateTextWithConfiguredProvider({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      temperature: 0.7,
      maxTokens: 900,
    });

    const wordsUsed = extractUsedWords(generated.text, normalizedInput.words);

    return NextResponse.json({
      story: generated.text,
      provider: generated.provider,
      model: generated.model,
      wordsRequested: normalizedInput.words.map((word) => word.word),
      wordsUsed,
      genre: normalizedInput.genre || "daily-life",
      difficulty: normalizedInput.difficulty || "B1",
    });
  } catch (error) {
    console.error("[v0] Story generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while generating story.",
      },
      { status: 500 },
    );
  }
}
