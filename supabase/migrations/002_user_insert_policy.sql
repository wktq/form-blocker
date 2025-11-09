-- Allow users to insert their own profile row after signup
CREATE POLICY "Users can create their own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
