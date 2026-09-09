export type UserRole =
  | 'super_admin'
  | 'admin';


export type SantriStatus =
  | 'Aktif'
  | 'Nonaktif'
  | 'Alumni';


export type IzinKegiatan =
  | 'Maghrib'
  | 'Subuh';


// ========================================
// SANTRI
// ========================================

export interface Santri {

  id: string;

  nis: string;

  nama_lengkap: string;

  asal_kota: string;

  universitas: string;

  kamar: string;

  wa_santri: string;

  wa_wali: string;

  telegram_wali: string;

  status: SantriStatus;

  foto_url: string;

  created_at: string;

  updated_at: string;

}


// ========================================
// IZIN
// ========================================

export interface Izin {

  id: string;

  santri_id: string;

  tanggal: string;

  kegiatan: IzinKegiatan;

  keterangan: string;

  dicatat_oleh: string;

  dicatat_pada: string;

  diubah_oleh: string | null;

  diubah_pada: string | null;


  // Relasi dengan tabel santri

  santri?: Santri;

}


// ========================================
// PROFILE USER
// ========================================

export interface Profile {

  id: string;

  nama: string;

  role: UserRole;

  created_at: string;

}


// ========================================
// LOG AKTIVITAS
// ========================================

export interface LogAktivitas {

  id: string;

  user_id: string;

  aksi: string;

  target_id: string;

  detail: string;


  // Waktu otomatis dari database

  created_at: string;


  // Relasi dengan profiles

  profiles?: Profile;

}
export interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  browser: string;
  os: string;
  last_active: string;
  is_blocked: boolean;
  created_at: string;
}
