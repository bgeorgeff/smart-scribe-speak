-- Restrict syllable_overrides write access to owner only
-- Owner UUID: 951cf7a6-a1e3-460f-85a5-3d1d02918729

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow insert syllable overrides" ON public.syllable_overrides;
DROP POLICY IF EXISTS "Allow update syllable overrides" ON public.syllable_overrides;
DROP POLICY IF EXISTS "Allow delete syllable overrides" ON public.syllable_overrides;

-- Create new owner-only policies
CREATE POLICY "Only owner can insert syllable overrides"
  ON public.syllable_overrides
  FOR INSERT
  WITH CHECK (auth.uid() = '951cf7a6-a1e3-460f-85a5-3d1d02918729');

CREATE POLICY "Only owner can update syllable overrides"
  ON public.syllable_overrides
  FOR UPDATE
  USING (auth.uid() = '951cf7a6-a1e3-460f-85a5-3d1d02918729');

CREATE POLICY "Only owner can delete syllable overrides"
  ON public.syllable_overrides
  FOR DELETE
  USING (auth.uid() = '951cf7a6-a1e3-460f-85a5-3d1d02918729');
