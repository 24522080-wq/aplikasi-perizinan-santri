import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cek apakah Environment Variable sudah tersedia
if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL belum ditemukan. Periksa Environment Variables.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY belum ditemukan. Periksa Environment Variables.'
  );
}

// Koneksi Supabase
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
