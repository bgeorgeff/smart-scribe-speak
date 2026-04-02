# Overview

Smart Scribe Speak is an accessibility-focused educational content tool built as a single-page React application. It generates readable content on user-specified topics at chosen grade levels, with features designed for users with dyslexia and other reading difficulties. Key features include text-to-speech playback, dyslexia-friendly font selection, adjustable font sizes, interactive word clicking (for definitions), voice input via microphone recording, and the ability to save/load generated content. The app uses Supabase for authentication and data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (with SWC for fast compilation)
- **Styling**: Tailwind CSS with CSS variables for theming (HSL color system)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: React Query (`@tanstack/react-query`) for server state, React `useState` for local state
- **Routing**: React Router DOM (Index page, Syllable Editor page, 404 catch-all)

## Path Aliases
- `@/*` maps to `./src/*` — all imports should use this alias pattern

## Project Structure
- `src/pages/` — Route-level page components (Index is the main app page)
- `src/components/` — Feature components (Auth, InteractiveText, ContentToolbar, FontSelector, SavedContentList, ResetPassword)
- `src/components/ui/` — shadcn/ui primitives (do not modify these directly unless necessary)
- `src/hooks/` — Custom hooks (useAudioRecorder, useSyllables, use-toast, use-mobile)
- `src/pages/SyllableEditor.tsx` — Admin page for searching and editing syllable breakdowns
- `src/integrations/supabase/` — Supabase client setup and auto-generated types
- `src/types/` — Shared TypeScript type definitions
- `src/lib/utils.ts` — Utility functions (cn for className merging)

## Key Design Patterns
- **Single-page app architecture**: Almost all functionality lives on the Index page, with auth as a gating component
- **Supabase Edge Functions**: Content generation and audio transcription are handled server-side via Supabase (invoked from the frontend). Edge function source code is in `supabase/functions/` — must be deployed to the Supabase project separately using the Supabase CLI.
- **Browser Speech Synthesis**: Text-to-speech uses the Web Speech API (`window.speechSynthesis`), not a cloud service
- **Audio Recording**: Uses the MediaRecorder Web API to capture microphone input, converts to base64, and sends to Supabase for transcription
- **Accessibility Focus**: Dyslexia-friendly fonts (Arial, Verdana, Helvetica, Tahoma, Calibri, Comic Sans MS), adjustable font sizes with named labels (Small/Medium/Large/Extra Large), interactive word clicking
- **Syllable Breakdown**: 161,471-word syllable dictionary stored as `public/syllables.json` (sourced from user's custom spreadsheet for dyslexic-optimized syllable divisions). Clicking a word shows a popup with syllable breakdown (e.g., "A· me· ri· can"). User corrections stored in localStorage as overrides, editable via `/syllable-editor` page. The `useSyllables` hook loads the JSON on first use and caches it in memory for instant lookups.

## Authentication
- Supabase Auth with email/password sign-up and sign-in
- Session persistence via localStorage
- Password reset flow handled through `ResetPassword` component
- Auth state checked on mount and monitored via `onAuthStateChange` listener

## Data Model (Supabase/Postgres)
- **`saved_content` table**: Stores user-generated content with fields for topic, grade_level, content, citations (JSON), font_family, font_size, user_id, and timestamps. RLS: user_id scoped (each user sees only their own).
- **`syllable_overrides` table**: Stores admin-managed syllable corrections that apply globally to all users. Fields: word (unique), syllables, timestamps. RLS: read open to all, write open (protected by app-level password on the Syllable Editor UI).

## Development Server
- Runs on port 5000 (configured in vite.config.ts)
- Host set to `0.0.0.0` for Replit compatibility
- Preview server also on port 5000

# External Dependencies

## Supabase (Required)
- **Purpose**: Authentication, database (saved_content table), and edge functions for content generation/transcription
- **Config**: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables
- **Client**: Initialized in `src/integrations/supabase/client.ts`
- **Types**: Auto-generated in `src/integrations/supabase/types.ts` — includes the `saved_content` table schema
- **Database Setup**: Run `supabase/setup.sql` in Supabase SQL Editor to create the `saved_content` table with RLS policies
- **Edge Functions**: Source code in `supabase/functions/`. Deploy via Supabase CLI. Required secrets: `OPENAI_API_KEY` (required), `BRAVE_SEARCH_API_KEY` (optional, for web search on current-events topics)
- **Edge Function Details**:
  - `generate-educational-content`: Uses OpenAI GPT-4o-mini for grade-level content generation, with optional Brave Search for current events
  - `speech-to-text`: Uses OpenAI Whisper for voice-to-text transcription

## Browser APIs Used
- **Web Speech API** (`speechSynthesis`): Text-to-speech playback
- **MediaRecorder API**: Voice input recording for topic entry
- **localStorage**: Auth session persistence

## Key NPM Packages
- `@supabase/supabase-js` — Supabase client
- `@tanstack/react-query` — Async state management
- `react-router-dom` — Client-side routing
- `lucide-react` — Icon library
- `sonner` — Toast notifications (secondary toaster)
- `vaul` — Drawer component
- `recharts` — Chart components (available but may not be actively used)
- `react-day-picker` + `date-fns` — Calendar/date picking
- `react-hook-form` + `@hookform/resolvers` + `zod` — Form handling and validation
- `embla-carousel-react` — Carousel functionality