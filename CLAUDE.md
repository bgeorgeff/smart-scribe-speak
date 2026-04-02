# Learn Anything — Project Context for Claude

This file gives Claude full context about the project, decisions made, and history across all sessions. Read this at the start of every session.

---

## What This App Is

**Learn Anything** is a web app that generates grade-appropriate educational content on any topic for students in grades 1–12. The user types a topic and selects a grade level, and the app generates structured educational content with citations.

**Live URL:** learnanything.us (custom domain on Cloudflare)
**GitHub repo:** https://github.com/bgeorgeff/smart-scribe-speak
**Supabase project:** zffzdgcldmcsdnxddfwj

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| Auth + DB | Supabase (auth, RLS policies, edge functions) |
| Backend logic | Supabase Edge Functions (Deno/TypeScript) |
| AI — content generation | OpenAI `gpt-4o` |
| AI — speech fallback | OpenAI `gpt-4o-mini` |
| Web search | Brave Search API |
| Speech-to-text | Supabase edge function (`speech-to-text`) |
| Frontend hosting | Cloudflare Pages (auto-deploys from GitHub `main` branch) |
| Package manager | npm |

---

## Deployment

- **Frontend**: Cloudflare Pages — auto-deploys when you push to GitHub `main`. No manual deploy step needed for frontend changes.
- **Backend (Edge Functions)**: Must be manually deployed via:
  ```bash
  cd "C:\Users\bg657\Documents\Claude\smart-scribe-speak-aka-learn-anything"
  supabase functions deploy generate-educational-content
  ```
- **GitHub push workflow** (run from project folder):
  ```bash
  git add -A
  git commit -m "your message"
  git push
  ```

---

## Key Architecture Decisions

### Content Generation (`generate-educational-content` edge function)
- **Always runs Brave Search** for every topic — no gating on keywords
- `requiresCurrentInfo` flag (based on keywords like "ranking", "latest", "score", etc.) controls date-specific prompting and live-event warnings, but does NOT control whether Brave runs
- **Hardened system prompt**: When Brave returns results, the prompt leads with a bold override instruction telling the model its training data is outdated and every fact MUST come from search results only
- **Model**: `gpt-4o` for content generation (better instruction following than `gpt-4o-mini`)
- **Model**: `gpt-4o-mini` kept only for the AI research fallback (when Brave fails)
- Grade-appropriate prompting: different complexity, vocabulary, sentence structure, and examples per grade band (1–3, 4–6, 7–9, 10–12)

### Why gpt-4o and not others
- `gpt-4.1` was tried but failed (incorrect model ID)
- `gpt-4o-mini` was the original model — too weak at following override instructions (cited stale training data instead of search results, e.g. Novak Djokovic as ATP #1 when he was actually #5)
- `Claude Sonnet 4.6` would be better at instruction following (~40% more expensive — $13.20 vs $9.50 per 1,000 calls) — worth revisiting if accuracy issues persist
- `Claude Haiku 4.5` ($4.40/1k calls) is NOT recommended for this use case — instruction following is its weak point, same problem as gpt-4o-mini

### Authentication
- Supabase auth with email/password
- **JWT verification toggle**: "Verify JWT with legacy secret" is set to **OFF** on both edge functions. This was a critical fix — the legacy toggle only accepted HS256 tokens but user tokens are ES256. With it OFF, the edge function's own `authenticateUser()` handles validation via `getUser()`.
- Frontend session handling: uses `getSession()` + `refreshSession()` fallback. If session is null, it refreshes before calling the edge function. If still null, shows a clear error message asking user to sign out and back in.

### Supabase RLS Policies
- `feedback` table: public INSERT allowed (anyone can submit), only `service_role` can SELECT (read)
- `syllable_overrides` table: public SELECT, owner-only INSERT/UPDATE/DELETE
- "RLS Policy Always True" warning on feedback is intentional and safe to ignore — public feedback submission is by design

### Text-to-Speech (iPhone fix)
- iOS was selecting a child/baby voice. Fixed in both `Index.tsx` and `ReviewWords.tsx` to explicitly filter out voices with "child" or "young" in the name, preferring adult en-US voices.

### Print styles
- Beige border/background removed from print output — prints as clean text on white background.

---

## Supabase Configuration

- **Site URL**: learnanything.us
- **Redirect URLs**: Only `https://learnanything.us/**` (all old Replit URLs have been deleted)
- **Edge functions**: `generate-educational-content`, `speech-to-text`
- **JWT legacy verification**: OFF on both functions

---

## File Structure (key files)

```
smart-scribe-speak-aka-learn-anything/
├── src/
│   ├── pages/
│   │   ├── Index.tsx          # Main page — content generation UI, auth, TTS
│   │   ├── ReviewWords.tsx    # Review words/flashcards page
│   │   └── SyllableEditor.tsx # Syllable editing page
│   ├── components/
│   │   ├── Auth.tsx           # Login/signup component
│   │   ├── ResetPassword.tsx
│   │   └── SavedContentList.tsx
│   └── integrations/supabase/
│       ├── client.ts
│       └── types.ts
├── supabase/
│   └── functions/
│       ├── generate-educational-content/index.ts   # Main AI content function
│       └── speech-to-text/index.ts
└── CLAUDE.md                  # This file
```

---

## Known Issues & History

| Issue | Status | Resolution |
|---|---|---|
| 401 errors on edge function | Fixed | JWT legacy verification toggle turned OFF in Supabase dashboard |
| 401 errors from expired frontend session | Fixed | Added `refreshSession()` fallback in `Index.tsx` before calling edge function |
| gpt-4.1 model ID failed | Fixed | Reverted to `gpt-4o` |
| AI citing stale training data (e.g. wrong ATP ranking) | Partially fixed | Switched to `gpt-4o` + hardened system prompt; may need Sonnet 4.6 if still occurring |
| iPhone TTS child voice | Fixed | Filter out child/young voices in voice selection logic |
| Beige border on print | Fixed | Updated print CSS |
| Cloudflare deploy — wrong build settings | Fixed | Framework: None, Build: `npm run build`, Output: `dist` |
| Git push failures (HEAD.lock, diverged branches) | Fixed | `del .git\HEAD.lock` then `git stash && git pull --rebase && git stash pop && git push` |

---

## Bob's Preferences & Notes

- **Non-developer user** — prefers plain English instructions, step-by-step with no assumed knowledge
- Deploying to **Cloudflare Pages** (auto-deploy from GitHub), NOT Vercel or Replit
- Project was originally on **Replit** — all Replit references have been cleaned from Supabase redirect URLs
- Bob's local project path: `C:\Users\bg657\Documents\Claude\smart-scribe-speak-aka-learn-anything`
- Bob's GitHub username: `bgeorgeff`
- Docker is NOT running on Bob's machine — this causes a warning during `supabase functions deploy` but does NOT prevent deployment

---

## Other Projects (from other sessions)

Bob also has these unrelated projects Claude has worked on:
- **Ohio FSBO/FRBO dashboard** — scrapes For Sale By Owner / For Rent By Owner listings in the Marysville–Powell, Ohio corridor (Plain City, Milford Center, Lewis Center, Delaware, Sunbury, etc.). Saved as an HTML dashboard with scheduled tasks at 11:40 AM and 6:30 PM daily.
- **Desktop/file organization** — organized Desktop folders into Documents with topic-based subfolders (especially a large Dyslexia/Dr. David Kilpatrick collection).
- **KeePass** — most recent database is `Database 6-12-21.kdbx` at `Documents\Personal\Personal\`.

---

## What Claude Cannot Access

- **Claude.ai chat history** — stored on Anthropic's servers, not locally. Cannot be included here automatically. Bob should manually paste important decisions from Claude.ai chats into this file.
- Sessions older than what's listed above are not available.
