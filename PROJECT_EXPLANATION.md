# VocabMaster - Project Overview

## What is VocabMaster?

VocabMaster is an **interactive English vocabulary learning platform** designed to help users master English words through structured daily lessons and AI-powered practice modes. It's built with Next.js 16, React 19, TypeScript, MongoDB, and integrates with multiple LLM providers (OpenAI, Gemini, OpenRouter).

---

## Core Features

### 1. **Day-Based Learning System**
- Users organize their learning into **"Days"** (similar to lessons)
- Each day contains a set of vocabulary words with definitions
- Users can add, edit, and delete words for each day
- Tracks total word count across all days

### 2. **Vocabulary Management**
- Add single words or bulk-add multiple words
- Each word includes:
  - The word itself
  - Definition
  - Optional example sentence
  - Usage tracking (times used, last used)
- Words are organized by day number

### 3. **AI-Powered Practice Modes** (7 modes)

#### a. **Story Generator**
- Generates a coherent, engaging story using all vocabulary words from the current day and previous days
- Ensures every word appears naturally in context
- B1-B2 level English with advanced vocabulary integration

#### b. **Daily Sentences**
- Creates 8-12 practical daily-life example sentences
- Uses current day and previous day vocabulary
- One sentence per line, no numbering

#### c. **Sentence Exam**
- Reviews learner's sentences for correctness
- Scores from 0-100
- Checks if target word is used naturally
- Provides feedback, better sentence suggestions, and weak points
- Supports single or batch review modes

#### d. **Interactive Dialogue**
- Generates realistic conversational dialogues (14-18 lines)
- Uses A/B speaker format
- Every line includes at least one current-day vocabulary word
- Designed for fill-in-the-blank practice

#### e. **Writing Practice**
- Creates writing prompts with topics, situations, and goals
- Provides suggested vocabulary and starter sentences
- Helps learners practice using words in context

#### f. **Speaking Agent** (Live)
- Uses Deepgram API for speech recognition
- Tracks speaking attempts, duration, and word coverage
- Provides feedback on spoken vocabulary usage
- Calculates words per minute and coverage percentage

#### g. **Music Practice**
- Generates song lyrics incorporating vocabulary words
- Structured format: Title, Verses, Chorus, Bridge, Outro
- Target length: 170-260 words
- Catchy, memorable format for better retention

---

## Technical Architecture

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 with dark mode support
- **Components**: Radix UI primitives + custom components
- **Icons**: Lucide React
- **Fonts**: Geist Sans + Geist Mono

### Backend
- **Database**: MongoDB (with repository pattern)
- **API Routes**: Next.js API routes under `/api/`
- **LLM Integration**: Multi-provider support
  - OpenAI (GPT-4o-mini)
  - Gemini (gemini-1.5-flash)
  - OpenRouter (multiple models)
  - Mock provider for development/testing

### Key Libraries
- **Zod**: Schema validation
- **React Hook Form**: Form management
- **Date-fns**: Date utilities
- **Sonner**: Toast notifications
- **Vercel Analytics**: Usage tracking

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── db/              # Database API routes
│   │   ├── deepgram/        # Deepgram speech API
│   │   └── llm/             # LLM generation endpoints
│   │       ├── daily-sentence/
│   │       ├── practice/
│   │       ├── sentence-exam/
│   │       ├── sentence-review/
│   │       └── story/
│   ├── day/
│   │   └── [id]/            # Day detail page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Dashboard (days list)
│
├── components/
│   ├── practice/            # Practice mode components
│   ├── ui/                  # Reusable UI components
│   ├── add-word-dialog.tsx
│   ├── add-words-dialog.tsx
│   ├── day-card.tsx
│   ├── edit-word-dialog.tsx
│   ├── word-list.tsx
│   └── ...
│
├── lib/
│   ├── db/
│   │   ├── mongodb.ts       # MongoDB connection
│   │   ├── repository.ts    # Data access layer
│   │   └── mock.ts          # Mock data for testing
│   ├── llm/
│   │   ├── client.ts        # Frontend LLM client
│   │   ├── providers.ts     # LLM provider implementations
│   │   ├── story-generator.ts
│   │   ├── practice-generator.ts
│   │   ├── daily-sentence.ts
│   │   ├── sentence-exam.ts
│   │   └── sentence-review.ts
│   ├── services/
│   │   ├── practice-context.ts
│   │   └── word-pool.ts
│   └── types/
│       └── index.ts         # TypeScript type definitions
│
└── hooks/                   # Custom React hooks
```

---

## Database Schema

### Collections
1. **users** - User accounts (email, creation date)
2. **days** - Learning days (user_id, day_number, timestamps)
3. **words** - Vocabulary words (day_id, word, definition, example, usage tracking)
4. **music** - Generated song lyrics (day_id, lyrics, words_used)
5. **speaking_attempts** - Speaking practice records (transcript, coverage, feedback)
6. **practices** - Practice sessions (type, response, words_used)

---

## LLM Integration Flow

1. **User Action**: Click a practice mode button
2. **Frontend Client**: Calls appropriate API endpoint via `lib/llm/client.ts`
3. **API Route**: Receives request, builds prompts using prompt templates
4. **Provider Selection**: Routes request to configured LLM provider
5. **Response Processing**: Extracts used words, formats output
6. **Display**: Shows generated content to user

### Prompt Engineering
- System prompts define the AI's role (tutor, coach, etc.)
- User prompts include vocabulary words with definitions
- Separates current day vs. previous day words
- Includes variation nonces to avoid duplicate outputs

---

## Configuration

Environment variables (`.env`):
- **MongoDB**: Connection string, database name
- **LLM Provider**: Choose between mock/openai/gemini/openrouter
- **API Keys**: OpenAI, Gemini, OpenRouter, Deepgram
- **Default User**: Fallback user for single-user mode

---

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

---

## Key Technical Decisions

1. **Multi-Provider LLM Support**: Easy switching between AI providers
2. **Repository Pattern**: Clean separation of database logic
3. **Type-Safe**: Full TypeScript coverage
4. **Mock Mode**: Development without API keys
5. **Modular Prompts**: Separated prompt builders for each practice mode
6. **Word Tracking**: Usage analytics for spaced repetition potential

---

## Use Cases

- **English Language Learners**: Build vocabulary systematically
- **Daily Practice**: Structured day-by-day learning
- **Multiple Learning Styles**: Visual (stories), auditory (speaking/music), interactive (dialogue), written (writing practice)
- **Self-Assessment**: Sentence exam mode for feedback
- **Retention**: Previous day words mixed into new content

---

## Future Enhancements (Not Yet Implemented)

- User authentication & multi-user support
- Spaced repetition algorithm for word review
- Progress tracking & analytics
- Arabic translation support (mentioned in UI)
- Mobile app version
- Social features (sharing stories, competing)

---

## Summary

**VocabMaster is an AI-powered English vocabulary learning platform** that helps users learn words through 7 different interactive practice modes. Users add vocabulary words organized by day, then practice using them through AI-generated stories, sentences, dialogues, writing prompts, songs, and speaking exercises. The platform supports multiple LLM providers and includes comprehensive usage tracking.

**Tech Stack**: Next.js 16 + React 19 + TypeScript + MongoDB + Tailwind CSS + OpenAI/Gemini/OpenRouter

**Target Audience**: Arabic-speaking English learners (based on UI hints)

**Learning Philosophy**: Repetition through varied contexts - words appear across multiple practice modes and days for better retention.
