-- Create the saved_content table
CREATE TABLE IF NOT EXISTS public.saved_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  grade_level text NOT NULL,
  content text NOT NULL,
  citations jsonb DEFAULT NULL,
  font_family text DEFAULT NULL,
  font_size text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.saved_content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own saved content
CREATE POLICY "Users can view own saved content"
  ON public.saved_content
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own saved content
CREATE POLICY "Users can insert own saved content"
  ON public.saved_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own saved content
CREATE POLICY "Users can update own saved content"
  ON public.saved_content
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own saved content
CREATE POLICY "Users can delete own saved content"
  ON public.saved_content
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_saved_content_user_id ON public.saved_content(user_id);

-- ============================================================
-- Syllable Overrides table (admin-managed, globally visible)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.syllable_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  word text NOT NULL UNIQUE,
  syllables text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.syllable_overrides ENABLE ROW LEVEL SECURITY;

-- Everyone can read syllable overrides (they apply globally to all users)
CREATE POLICY "Anyone can read syllable overrides"
  ON public.syllable_overrides
  FOR SELECT
  USING (true);

-- Write access open (the Syllable Editor UI is password-protected at the app level)
CREATE POLICY "Allow insert syllable overrides"
  ON public.syllable_overrides
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update syllable overrides"
  ON public.syllable_overrides
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow delete syllable overrides"
  ON public.syllable_overrides
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_syllable_overrides_word ON public.syllable_overrides(word);
