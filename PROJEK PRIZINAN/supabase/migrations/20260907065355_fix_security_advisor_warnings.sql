/*
# Fix security advisor warnings

## Changes
1. Revoke EXECUTE on `handle_new_user()` from anon and authenticated roles.
   This function should only be called by the database trigger, not via the REST API.
2. Fix `update_updated_at()` to add `SET search_path = public` (same search_path trap).
3. Revoke EXECUTE on `update_updated_at()` from anon and authenticated roles — it's a trigger function, not an API endpoint.

## Security
- Both functions are SECURITY DEFINER trigger functions that should never be callable via REST API.
- SET search_path prevents search_path injection on both functions.
*/

-- 1. Lock down handle_new_user: revoke public EXECUTE, restrict to trigger use only
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 2. Fix update_updated_at: add SET search_path and revoke public EXECUTE
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
