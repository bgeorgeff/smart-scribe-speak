# Learn Anything — Project Context for Claude

This file gives Claude full context about the project, decisions made, and history across all sessions. Read this at the start of every session.

**Claude instructions**: During every session, update this file whenever: a new model is chosen, a deployment command changes, a bug is fixed, a new API key is added, or any architectural decision is made. Do not wait until the end — update as changes happen.

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
| AI — content generation | Anthropic `claude-sonnet-4-6` |
| AI — research fallback | OpenAI `gpt-4o-mini` (when Brave search fails) |
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
  cd "C:\Users\bg657\Documents\Claude\smart-scribe-speak-aka-learn-anything" && supabase functions deploy generate-educational-content --no-verify-jwt
  ```
  **IMPORTANT**: Always include `--no-verify-jwt` — omitting it causes 401 auth errors.
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
- `requiresCurrentInfo` flag (based on keywords like "ranking", "latest", "score", "news", etc.) controls date-specific prompting and live-event warnings, but does NOT control whether Brave runs
- **Hardened system prompt**: When Brave returns results, the prompt leads with a bold override instruction telling the model its training data is outdated and every fact MUST come from search results only
- **Model**: `claude-sonnet-4-6` (Anthropic) for content generation — better instruction following than any OpenAI model tested
- **Model**: `gpt-4o-mini` (OpenAI) kept only for the AI research fallback (when Brave fails)
- Grade-appropriate prompting: different complexity, vocabulary, sentence structure, and examples per grade band (1–3, 4–6, 7–9, 10–12)
- **API keys required in Supabase secrets**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`

### Model history
- `gpt-4o-mini` — original model, too weak at following override instructions (cited stale training data, e.g. Djokovic as ATP #1 when he was #5)
- `gpt-4.1` — tried, failed (incorrect model ID)
- `gpt-4o` — better but still mixed training data with search results, cited broken/401 URLs
- `claude-sonnet-4-6` — current model, strongest instruction following (~$13.20 vs $9.50 per 1,000 calls vs gpt-4o)
- `Claude Haiku 4.5` — NOT recommended, same instruction-following weakness as gpt-4o-mini

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
│   │   ├── Index.tsx             # Main page — content generation UI, auth, TTS
│   │   ├── ReviewWords.tsx       # Review words/flashcards page
│   │   ├── SyllableEditor.tsx    # Syllable editing page
│   │   └── AdminDashboard.tsx    # Admin-only dashboard at /admin
│   ├── components/
│   │   ├── Auth.tsx              # Login/signup component
│   │   ├── ResetPassword.tsx
│   │   └── SavedContentList.tsx
│   └── integrations/supabase/
│       ├── client.ts
│       └── types.ts
├── supabase/
│   ├── functions/
│   │   ├── generate-educational-content/index.ts   # Main AI content function (also logs searches)
│   │   ├── speech-to-text/index.ts
│   │   ├── notify-new-user/index.ts                # Sends email to Bob on new signup (uses Resend)
│   │   └── get-admin-data/index.ts                 # Returns all users/searches/saved for admin dashboard
│   └── migrations/
│       └── 20260425_create_search_logs.sql         # search_logs table
└── CLAUDE.md                     # This file
```

---

## Admin Features (added April 2026)

### Admin Dashboard (`/admin`)
- Only accessible when logged in as `bgeorgeff@gmail.com` — anyone else sees "Access Denied"
- Shows 3 tabs: Users (all signups + last sign-in), Searches (every topic searched), Saved Passages
- All tabs have live filter boxes
- Powered by the `get-admin-data` edge function (service role key, never exposed to frontend)
- **Deploy command**: push to GitHub (frontend auto-deploys), then deploy the edge function (see below)

### New-User Email Notification (`notify-new-user` edge function)
- Fires whenever a new user signs up via a Supabase Auth webhook
- Sends an email to `bgeorgeff@protonmail.com` via Resend API
- **Requires**: `RESEND_API_KEY` secret set in Supabase (see setup instructions in Known Issues)
- If `RESEND_API_KEY` is not set, it logs to console but does NOT fail

### Search Logging (`search_logs` table)
- Every content generation call inserts a row into `search_logs` (user_id, topic, grade_level, created_at)
- RLS: users can insert their own rows; only service_role can read
- The admin dashboard enriches logs with user emails server-side

### Deploy commands for new edge functions
```bash
cd "C:\Users\bg657\Documents\Claude\smart-scribe-speak-aka-learn-anything"
supabase functions deploy notify-new-user --no-verify-jwt
supabase functions deploy get-admin-data --no-verify-jwt
supabase functions deploy generate-educational-content --no-verify-jwt
```

---

## Known Issues & History

| Issue | Status | Resolution |
|---|---|---|
| 401 errors on edge function | Fixed | JWT legacy verification toggle turned OFF in Supabase dashboard |
| 401 errors from expired frontend session | Fixed | Added `refreshSession()` fallback in `Index.tsx` before calling edge function |
| gpt-4.1 model ID failed | Fixed | Reverted to `gpt-4o`, then switched to `claude-sonnet-4-6` |
| AI citing stale training data (e.g. wrong ATP ranking) | Fixed | Switched to `claude-sonnet-4-6` + hardened system prompt |
| gpt-4o citing broken/401 URLs from Brave results | Switched models | Now using `claude-sonnet-4-6` which follows source instructions more reliably |
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
