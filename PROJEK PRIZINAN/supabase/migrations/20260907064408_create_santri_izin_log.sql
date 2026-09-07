/*
# Create Schema for Perizinan Santri App (Part 2: santri, izin, log_aktivitas)

## Overview
Creates the remaining tables now that profiles exists.

## New Tables

### 1. `santri` — Master data santri
- `id` (uuid, PK)
- `nis` (text, unique) — Nomor Induk Santri
- `nama_lengkap` (text) — Nama lengkap santri
- `asal_kota` (text) — Asal kota
- `universitas` (text) — Universitas santri
- `kamar` (text) — Jenis kamar (Sendiri/Berdua)
- `wa_santri` (text) — Nomor WA santri
- `wa_wali` (text) — Nomor WA wali
- `telegram_wali` (text) — Telegram ID wali
- `status` (santri_status) — Status santri
- `foto_url` (text) — URL foto santri (opsional)
- `created_at`, `updated_at` (timestamptz)

### 2. `izin` — Pencatatan izin santri
- `id` (uuid, PK)
- `santri_id` (uuid, FK -> santri.id)
- `tanggal` (date) — Tanggal izin
- `kegiatan` (izin_kegiatan) — Maghrib/Subuh
- `keterangan` (text) — Alasan/keterangan
- `dicatat_oleh` (uuid, FK -> auth.users.id)
- `dicatat_pada` (timestamptz)
- `diubah_oleh` (uuid, nullable)
- `diubah_pada` (timestamptz, nullable)
- Unique constraint on (santri_id, tanggal, kegiatan)

### 3. `log_aktivitas` — Audit trail
- `id` (uuid, PK)
- `user_id` (uuid, FK -> auth.users.id)
- `aksi` (text) — Jenis aksi
- `target_id` (text) — ID target
- `detail` (text) — Detail tambahan
- `waktu` (timestamptz)

## Security
- santri: all authenticated can read; only super_admin can insert/update/delete
- izin: all authenticated can read; authenticated users can insert/update/delete
- log_aktivitas: all authenticated can read; users can insert own

## Triggers
- Auto-update updated_at on santri
*/

-- 1. santri table
CREATE TABLE IF NOT EXISTS santri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nis text UNIQUE NOT NULL,
  nama_lengkap text NOT NULL,
  asal_kota text DEFAULT '',
  universitas text DEFAULT '',
  kamar text DEFAULT '',
  wa_santri text DEFAULT '',
  wa_wali text DEFAULT '',
  telegram_wali text DEFAULT '',
  status santri_status NOT NULL DEFAULT 'Aktif',
  foto_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_santri" ON santri;
CREATE POLICY "read_santri" ON santri FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_santri" ON santri;
CREATE POLICY "insert_santri" ON santri FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "update_santri" ON santri;
CREATE POLICY "update_santri" ON santri FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "delete_santri" ON santri;
CREATE POLICY "delete_santri" ON santri FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- 2. izin table
CREATE TABLE IF NOT EXISTS izin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id uuid NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  kegiatan izin_kegiatan NOT NULL,
  keterangan text DEFAULT '',
  dicatat_oleh uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  dicatat_pada timestamptz DEFAULT now(),
  diubah_oleh uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  diubah_pada timestamptz,
  UNIQUE (santri_id, tanggal, kegiatan)
);

ALTER TABLE izin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_izin" ON izin;
CREATE POLICY "read_izin" ON izin FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_izin" ON izin;
CREATE POLICY "insert_izin" ON izin FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = dicatat_oleh);

DROP POLICY IF EXISTS "update_izin" ON izin;
CREATE POLICY "update_izin" ON izin FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_izin" ON izin;
CREATE POLICY "delete_izin" ON izin FOR DELETE
  TO authenticated USING (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_izin_tanggal_kegiatan ON izin(tanggal, kegiatan);
CREATE INDEX IF NOT EXISTS idx_izin_santri_id ON izin(santri_id);

-- 3. log_aktivitas table
CREATE TABLE IF NOT EXISTS log_aktivitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aksi text NOT NULL,
  target_id text DEFAULT '',
  detail text DEFAULT '',
  waktu timestamptz DEFAULT now()
);

ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_log_aktivitas" ON log_aktivitas;
CREATE POLICY "read_log_aktivitas" ON log_aktivitas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_log_aktivitas" ON log_aktivitas;
CREATE POLICY "insert_log_aktivitas" ON log_aktivitas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-update updated_at on santri
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS santri_updated_at ON santri;
CREATE TRIGGER santri_updated_at
  BEFORE UPDATE ON santri
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();