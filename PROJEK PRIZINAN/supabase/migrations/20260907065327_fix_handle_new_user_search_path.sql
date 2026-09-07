/*
# Fix handle_new_user trigger function

## Problem
The `handle_new_user()` trigger function was `SECURITY DEFINER` without a `SET search_path` clause.
This is a known Supabase trap: the function runs with the privileges of its owner (postgres),
but inherits the caller's `search_path`, which includes `"$user"` (the current role name).
During the trigger execution after signup, the `search_path` may not resolve the `profiles`
table or `user_role` enum correctly, causing the INSERT to fail and rolling back the entire
user creation — resulting in the "Database error saving new user" error.

## Fix
1. Recreate `handle_new_user()` with `SET search_path = public` to lock the schema resolution.
2. Schema-qualify the `profiles` table reference as `public.profiles` for extra safety.
3. Use `public.user_role` enum explicitly.
4. Drop and recreate the trigger to ensure it uses the updated function.

## Security
- The function remains `SECURITY DEFINER` (required to insert into profiles during signup).
- `SET search_path = public` prevents search_path injection.
- No RLS changes needed — the trigger operates as the postgres owner which bypasses RLS.
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', ''),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin') THEN 'super_admin'::public.user_role
      ELSE 'admin'::public.user_role
    END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
