-- Restrict feedback SELECT access to backend/service role only
-- Users can submit feedback but cannot read it back

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Allow authenticated users to read" ON public.feedback;

-- Optional: Add explicit service_role policy if you want to be explicit
-- (service_role bypasses RLS by default, but this makes it clear in the policy list)
CREATE POLICY "Only service role can read feedback"
  ON public.feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Keep the public INSERT policy unchanged
-- (already exists: "Allow public insert")
