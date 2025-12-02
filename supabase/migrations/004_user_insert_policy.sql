-- Allow users to insert their own profile row after signup
DROP POLICY IF EXISTS "Users can create their own data" ON public.users;
CREATE POLICY "Users can create their own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
