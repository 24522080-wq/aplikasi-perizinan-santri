/*
# Create Schema for Perizinan Santri App (Part 1: profiles + enums)

## Overview
Creates the profiles table and enums first, since other tables' RLS policies reference profiles.
This app requires authentication (pengurus login) so all tables use authenticated-scoped RLS.

## New Tables

### `profiles` — Profile pengurus (extends auth.users)
- `id` (uuid, PK, FK -> auth.users.id)
- `nama` (text) — Nama pengurus
- `role` (user_role) — Role pengurus (super_admin/admin)
- `created_at` (timestamptz)

## Enums
- `santri_status`: Aktif, Nonaktif, Alumni
- `izin_kegiatan`: Maghrib, Subuh
- `user_role`: super_admin, admin

## Security
- RLS enabled on profiles
- All authenticated users can read profiles (needed for display names)
- Users can insert/update only their own profile

## Triggers
- Auto-create profile on signup (first user becomes super_admin)
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE santri_status AS ENUM ('Aktif', 'Nonaktif', 'Alumni');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE izin_kegiatan AS ENUM ('Maghrib', 'Subuh');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama text DEFAULT '',
  role user_role NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_profiles" ON profiles;
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on signup
-- First user becomes super_admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nama, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', ''),
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'super_admin') THEN 'super_admin'::user_role
      ELSE 'admin'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();