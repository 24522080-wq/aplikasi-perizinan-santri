import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  UserCog,
  Loader2,
  ShieldCheck,
  Shield,
  AlertCircle,
  X,
  Smartphone,
  Monitor,
  Tablet,
  Ban,
  CheckCircle2,
  RefreshCw,
  Clock,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

import { useAuth } from '@/context/AuthContext';

import { getDeviceId } from '@/lib/device';

import type {
  Profile,
  UserDevice,
  UserRole,
} from '@/types';

export function UserManagementPage() {
  const {
    profile: currentUser,
    refreshProfile,
  } = useAuth();

  // =========================================================
  // STATE USER
  // =========================================================

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =========================================================
  // STATE DEVICE
  // =========================================================

  const [devices, setDevices] =
    useState<UserDevice[]>([]);

  const [deviceLoading, setDeviceLoading] =
    useState(false);

  // =========================================================
  // STATE ERROR
  // =========================================================

  const [error, setError] =
    useState<string | null>(null);

  // =========================================================
  // STATE EDIT USER
  // =========================================================

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editNama, setEditNama] =
    useState('');

  const [editRole, setEditRole] =
    useState<UserRole>('admin');

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // AMBIL DATA USER + DEVICE
  // =========================================================

  const fetchData = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          profileResult,
          deviceResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .order('created_at', {
              ascending: true,
            }),

          supabase
            .from('user_devices')
            .select('*')
            .order('last_active', {
              ascending: false,
            }),
        ]);

        // ===================================================
        // PROFILE
        // ===================================================

        if (profileResult.error) {
          console.error(
            'Error fetching profiles:',
            profileResult.error
          );

          setError(
            'Gagal mengambil data pengguna.'
          );
        } else {
          setProfiles(
            (profileResult.data ??
              []) as Profile[]
          );
        }

        // ===================================================
        // DEVICE
        // ===================================================

        if (deviceResult.error) {
          console.error(
            'Error fetching devices:',
            deviceResult.error
          );

          setError(
            'Gagal mengambil data perangkat.'
          );
        } else {
          setDevices(
            (deviceResult.data ??
              []) as UserDevice[]
          );
        }
      } catch (err) {
        console.error(
          'Fetch data error:',
          err
        );

        setError(
          'Terjadi kesalahan saat mengambil data.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // =========================================================
  // LOAD DATA SAAT HALAMAN DIBUKA
  // =========================================================

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================================================
  // BUKA MODAL EDIT
  // =========================================================

  const openEdit = (
    profile: Profile
  ) => {
    setEditingId(profile.id);

    setEditNama(
      profile.nama ?? ''
    );

    setEditRole(
      profile.role ?? 'admin'
    );

    setError(null);
  };

  // =========================================================
  // TUTUP MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setEditingId(null);

    setEditNama('');

    setEditRole('admin');
  };

  // =========================================================
  // SIMPAN PERUBAHAN USER
  // =========================================================

  const handleSave = async () => {
    if (!editingId) {
      return;
    }

    if (
      editNama.trim().length < 2
    ) {
      setError(
        'Nama minimal 2 karakter.'
      );

      return;
    }

    setSaving(true);

    setError(null);

    try {
      const oldProfile =
        profiles.find(
          (item) =>
            item.id ===
            editingId
        );

      const { error } =
        await supabase
          .from('profiles')
          .update({
            nama:
              editNama.trim(),

            role:
              editRole,
          })
          .eq(
            'id',
            editingId
          );

      if (error) {
        console.error(
          'Update user error:',
          error
        );

        setError(
          'Gagal memperbarui pengguna.'
        );

        return;
      }

      // =====================================================
      // SIMPAN LOG AKTIVITAS
      // =====================================================

      if (currentUser) {
        const { error: logError } =
          await supabase
            .from('log_aktivitas')
            .insert({
              user_id:
                currentUser.id,

              target_id:
                editingId,

              aksi:
                'edit_user',

              detail:
                `Mengubah user ${
                  oldProfile?.nama ??
                  editingId
                } menjadi ${
                  editNama.trim()
                } dengan role ${
                  editRole
                }`,
            });

        if (logError) {
          console.error(
            'Log error:',
            logError
          );
        }
      }

      await refreshProfile();

      await fetchData();

      closeModal();
    } catch (err) {
      console.error(
        'Save user error:',
        err
      );

      setError(
        'Terjadi kesalahan saat menyimpan perubahan.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // BLOKIR / BUKA BLOKIR DEVICE
  // =========================================================

  const toggleDevice = async (
    device: UserDevice
  ) => {
    // =======================================================
    // DEVICE ID YANG SEDANG DIGUNAKAN
    // =======================================================

    const currentDeviceId =
      getDeviceId();

    // =======================================================
    // CEGAH SUPER ADMIN MEMBLOKIR DEVICE SENDIRI
    // =======================================================

    const isCurrentDevice =
      device.user_id ===
        currentUser?.id &&
      device.device_id ===
        currentDeviceId;

    if (isCurrentDevice) {
      setError(
        'Perangkat yang sedang Anda gunakan tidak dapat diblokir.'
      );

      return;
    }

    // =======================================================
    // KONFIRMASI
    // =======================================================

    const action =
      device.is_blocked
        ? 'membuka blokir'
        : 'memblokir';

    const confirmed =
      window.confirm(
        `Yakin ingin ${action} perangkat "${device.device_name ?? 'Unknown Device'}"?`
      );

    if (!confirmed) {
      return;
    }

    setDeviceLoading(true);

    setError(null);

    const newBlockedStatus =
      !device.is_blocked;

    try {
      // =====================================================
      // UPDATE DATABASE
      // =====================================================

      const { error } =
        await supabase
          .from('user_devices')
          .update({
            is_blocked:
              newBlockedStatus,
          })
          .eq(
            'id',
            device.id
          );

      if (error) {
        console.error(
          'Toggle device error:',
          error
        );

        setError(
          `Gagal ${action} perangkat.`
        );

        return;
      }

      // =====================================================
      // LOG AKTIVITAS
      // =====================================================

      if (currentUser) {
        const { error: logError } =
          await supabase
            .from('log_aktivitas')
            .insert({
              user_id:
                currentUser.id,

              target_id:
                device.id,

              aksi:
                newBlockedStatus
                  ? 'blokir_perangkat'
                  : 'buka_blokir_perangkat',

              detail:
                `${
                  newBlockedStatus
                    ? 'Memblokir'
                    : 'Membuka blokir'
                } perangkat ${
                  device.device_name ??
                  'Unknown Device'
                } - ${
                  device.browser ??
                  'Unknown Browser'
                } - ${
                  device.os ??
                  'Unknown OS'
                } milik user ${
                  device.user_id
                }`,
            });

        if (logError) {
          console.error(
            'Device log error:',
            logError
          );
        }
      }

      // =====================================================
      // UPDATE TAMPILAN TANPA REFRESH
      // =====================================================

      setDevices(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              device.id
                ? {
                    ...item,
                    is_blocked:
                      newBlockedStatus,
                  }
                : item
          )
      );
    } catch (err) {
      console.error(
        'Toggle device exception:',
        err
      );

      setError(
        `Terjadi kesalahan saat ${action} perangkat.`
      );
    } finally {
      setDeviceLoading(false);
    }
  };

  // =========================================================
  // ICON DEVICE
  // =========================================================

  const DeviceIcon = ({
    device,
  }: {
    device: UserDevice;
  }) => {
    const os =
      (
        device.os ??
        ''
      ).toLowerCase();

    if (
      os.includes(
        'android'
      )
    ) {
      return (
        <Smartphone className="w-5 h-5" />
      );
    }

    if (
      os.includes(
        'iphone'
      ) ||
      os.includes(
        'ios'
      )
    ) {
      return (
        <Smartphone className="w-5 h-5" />
      );
    }

    if (
      os.includes(
        'ipad'
      )
    ) {
      return (
        <Tablet className="w-5 h-5" />
      );
    }

    return (
      <Monitor className="w-5 h-5" />
    );
  };

  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  const formatLastActive = (
    value: string
  ) => {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return date.toLocaleString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  // =========================================================
  // CEK DEVICE AKTIF
  // =========================================================

  const isRecentlyActive = (
    value: string
  ) => {
    if (!value) {
      return false;
    }

    const lastActive =
      new Date(
        value
      ).getTime();

    if (
      Number.isNaN(
        lastActive
      )
    ) {
      return false;
    }

    const now =
      Date.now();

    return (
      now -
        lastActive <
      2 * 60 * 1000
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">

        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />

      </div>
    );
  }

  // =========================================================
  // USER YANG SEDANG DIEDIT
  // =========================================================

  const editingProfile =
    profiles.find(
      (item) =>
        item.id ===
        editingId
    );

  // =========================================================
  // DEVICE MILIK USER YANG SEDANG DIEDIT
  // =========================================================

  const editingDevices =
    devices.filter(
      (device) =>
        device.user_id ===
        editingId
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-3">

            <UserCog className="w-7 h-7 text-primary-600" />

            <h1 className="text-2xl font-bold text-stone-800">
              Manajemen User
            </h1>

          </div>

          <p className="text-sm text-stone-500 mt-1">
            Kelola pengguna dan perangkat yang digunakan
            untuk mengakses sistem.
          </p>

        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition text-sm font-medium"
        >

          <RefreshCw className="w-4 h-4" />

          Refresh

        </button>

      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />

          <p className="text-sm flex-1">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="hover:bg-red-100 rounded-lg p-1"
          >

            <X className="w-4 h-4" />

          </button>

        </div>
      )}

      {/* =====================================================
          USER LIST
      ====================================================== */}

      <div className="grid gap-4">

        {profiles.map(
          (item) => {
            const userDevices =
              devices.filter(
                (device) =>
                  device.user_id ===
                  item.id
              );

            const blockedCount =
              userDevices.filter(
                (device) =>
                  device.is_blocked
              ).length;

            const activeCount =
              userDevices.filter(
                (device) =>
                  !device.is_blocked &&
                  isRecentlyActive(
                    device.last_active
                  )
              ).length;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >

                <div className="flex items-center justify-between gap-4">

                  {/* =========================================
                      USER INFO
                  ========================================== */}

                  <div className="flex items-center gap-4 min-w-0">

                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">

                      {item.role ===
                      'super_admin' ? (
                        <ShieldCheck className="w-6 h-6 text-primary-600" />
                      ) : (
                        <Shield className="w-6 h-6 text-stone-500" />
                      )}

                    </div>

                    <div className="min-w-0">

                      <h3 className="font-semibold text-lg text-stone-800 truncate">
                        {item.nama ??
                          'Tanpa Nama'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1">

                        <span className="text-sm text-stone-500">
                          {item.role ===
                          'super_admin'
                            ? 'Super Admin'
                            : 'Admin'}
                        </span>

                        <span className="text-stone-300">
                          •
                        </span>

                        <span className="text-sm text-stone-500">
                          {userDevices.length}{' '}
                          perangkat
                        </span>

                        {activeCount >
                          0 && (
                          <>
                            <span className="text-stone-300">
                              •
                            </span>

                            <span className="text-sm text-green-600">
                              {activeCount}{' '}
                              aktif
                            </span>
                          </>
                        )}

                        {blockedCount >
                          0 && (
                          <>
                            <span className="text-stone-300">
                              •
                            </span>

                            <span className="text-sm text-red-600">
                              {blockedCount}{' '}
                              diblokir
                            </span>
                          </>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* =========================================
                      BUTTON
                  ========================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(item)
                    }
                    className="flex-shrink-0 px-4 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition text-sm font-medium"
                  >
                    Kelola
                  </button>

                </div>

              </div>
            );
          }
        )}

        {/* ===================================================
            EMPTY USER
        ==================================================== */}

        {profiles.length ===
          0 && (
          <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center">

            <UserCog className="w-10 h-10 mx-auto mb-3 text-stone-400" />

            <p className="text-sm text-stone-500">
              Belum ada data pengguna.
            </p>

          </div>
        )}

      </div>

      {/* =====================================================
          MODAL KELOLA USER
      ====================================================== */}

      {editingId &&
        editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* =================================================
                  MODAL HEADER
              ================================================== */}

              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">

                <div>

                  <h2 className="text-xl font-bold text-stone-800">
                    Kelola User
                  </h2>

                  <p className="text-sm text-stone-500 mt-0.5">
                    {editingProfile.nama ??
                      'Tanpa Nama'}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-lg p-2 hover:bg-stone-100 transition disabled:opacity-50"
                >

                  <X className="w-5 h-5" />

                </button>

              </div>

              <div className="space-y-7 p-6">

                {/* =================================================
                    INFORMASI USER
                ================================================== */}

                <section>

                  <h3 className="mb-4 font-semibold text-stone-800">
                    Informasi User
                  </h3>

                  <div className="space-y-4">

                    {/* NAMA */}

                    <div>

                      <label className="block text-sm font-medium text-stone-600 mb-1.5">
                        Nama Lengkap
                      </label>

                      <input
                        type="text"
                        value={
                          editNama
                        }
                        onChange={(e) =>
                          setEditNama(
                            e.target
                              .value
                          )
                        }
                        className="input-field"
                        placeholder="Nama pengurus"
                      />

                    </div>

                    {/* ROLE */}

                    <div>

                      <label className="block text-sm font-medium text-stone-600 mb-1.5">
                        Role
                      </label>

                      <select
                        value={
                          editRole
                        }
                        onChange={(e) =>
                          setEditRole(
                            e.target
                              .value as UserRole
                          )
                        }
                        className="input-field"
                      >

                        <option value="admin">
                          Admin
                        </option>

                        <option value="super_admin">
                          Super Admin
                        </option>

                      </select>

                    </div>

                  </div>

                </section>

                {/* =================================================
                    PEMBATAS
                ================================================== */}

                <div className="border-t border-stone-200" />

                {/* =================================================
                    PERANGKAT
                ================================================== */}

                <section>

                  <div className="mb-4 flex items-start justify-between gap-4">

                    <div>

                      <h3 className="font-semibold text-stone-800">
                        Perangkat Login
                      </h3>

                      <p className="text-sm text-stone-500 mt-1">
                        Lihat perangkat yang digunakan
                        user dan blokir perangkat tertentu.
                      </p>

                    </div>

                    <span className="flex-shrink-0 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                      {
                        editingDevices.length
                      }{' '}
                      perangkat
                    </span>

                  </div>

                  {/* =================================================
                      EMPTY DEVICE
                  ================================================== */}

                  {editingDevices.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center">

                      <Monitor className="mx-auto mb-3 h-9 w-9 text-stone-400" />

                      <p className="text-sm text-stone-500">
                        Belum ada perangkat
                        yang terdaftar.
                      </p>

                    </div>
                  ) : (
                    <div className="space-y-3">

                      {editingDevices.map(
                        (device) => {
                          const active =
                            isRecentlyActive(
                              device.last_active
                            );

                          const currentDevice =
                            device.user_id ===
                              currentUser?.id &&
                            device.device_id ===
                              getDeviceId();

                          return (
                            <div
                              key={
                                device.id
                              }
                              className={`rounded-xl border p-4 transition ${
                                device.is_blocked
                                  ? 'border-red-200 bg-red-50'
                                  : 'border-stone-200 bg-stone-50'
                              }`}
                            >

                              <div className="flex items-start gap-4">

                                {/* =================================
                                    DEVICE ICON
                                ================================== */}

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-stone-200">

                                  <DeviceIcon
                                    device={
                                      device
                                    }
                                  />

                                </div>

                                {/* =================================
                                    DEVICE INFORMATION
                                ================================== */}

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <h4 className="font-semibold text-stone-800">
                                      {device.device_name ??
                                        'Unknown Device'}
                                    </h4>

                                    {/* ACTIVE */}

                                    {active &&
                                      !device.is_blocked && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">

                                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

                                          Aktif

                                        </span>
                                      )}

                                    {/* BLOCKED */}

                                    {device.is_blocked && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">

                                        <Ban className="h-3 w-3" />

                                        Diblokir

                                      </span>
                                    )}

                                    {/* CURRENT */}

                                    {currentDevice && (
                                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                                        Perangkat saat ini
                                      </span>
                                    )}

                                  </div>

                                  {/* BROWSER + OS */}

                                  <div className="mt-1 text-sm text-stone-600">

                                    {device.browser ??
                                      'Unknown Browser'}

                                    <span className="mx-1">
                                      •
                                    </span>

                                    {device.os ??
                                      'Unknown OS'}

                                  </div>

                                  {/* LAST ACTIVE */}

                                  <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">

                                    <Clock className="h-3.5 w-3.5" />

                                    <span>
                                      Terakhir aktif:{' '}
                                      {formatLastActive(
                                        device.last_active
                                      )}
                                    </span>

                                  </div>

                                </div>

                                {/* =================================
                                    BLOCK BUTTON
                                ================================== */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleDevice(
                                      device
                                    )
                                  }
                                  disabled={
                                    deviceLoading ||
                                    currentDevice
                                  }
                                  title={
                                    currentDevice
                                      ? 'Perangkat yang sedang digunakan tidak dapat diblokir'
                                      : device.is_blocked
                                        ? 'Buka blokir perangkat'
                                        : 'Blokir perangkat'
                                  }
                                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                    device.is_blocked
                                      ? 'border border-green-200 bg-white text-green-700 hover:bg-green-50'
                                      : 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                                  }`}
                                >

                                  {device.is_blocked ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4" />

                                      <span className="hidden sm:inline">
                                        Buka Blokir
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4" />

                                      <span className="hidden sm:inline">
                                        Blokir
                                      </span>
                                    </>
                                  )}

                                </button>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </section>

              </div>

              {/* =================================================
                  MODAL FOOTER
              ================================================== */}

              <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t border-stone-200 bg-white px-6 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={
                    saving
                  }
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2 disabled:opacity-50"
                >

                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Simpan Perubahan

                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}
