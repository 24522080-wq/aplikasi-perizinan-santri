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

import {
  useAuth,
} from '@/context/AuthContext';

import {
  getDeviceId,
} from '@/lib/device';

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

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [devices, setDevices] =
    useState<UserDevice[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [deviceLoading, setDeviceLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editNama, setEditNama] =
    useState('');

  const [editRole, setEditRole] =
    useState<UserRole>('admin');

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // FETCH DATA
  // =========================================================

  const fetchData = useCallback(
    async () => {
      setLoading(true);

      setError(null);

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

      if (profileResult.error) {
        console.error(
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

      if (deviceResult.error) {
        console.error(
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

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEdit = (
    profile: Profile
  ) => {
    setEditingId(profile.id);

    setEditNama(profile.nama);

    setEditRole(profile.role);

    setError(null);
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) return;

    setEditingId(null);

    setEditNama('');

    setEditRole('admin');
  };

  // =========================================================
  // SAVE USER
  // =========================================================

  const handleSave = async () => {
    if (!editingId) return;

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

    const oldProfile =
      profiles.find(
        (item) =>
          item.id === editingId
      );

    const { error } =
      await supabase
        .from('profiles')
        .update({
          nama: editNama.trim(),
          role: editRole,
        })
        .eq(
          'id',
          editingId
        );

    if (error) {
      console.error(error);

      setError(
        'Gagal memperbarui pengguna.'
      );

      setSaving(false);

      return;
    }

    // =======================================================
    // LOG
    // =======================================================

    if (currentUser) {
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
    }

    await refreshProfile();

    await fetchData();

    setSaving(false);

    closeModal();
  };

  // =========================================================
  // TOGGLE BLOCK DEVICE
  // =========================================================

  const toggleDevice = async (
    device: UserDevice
  ) => {
    // =======================================================
    // JANGAN BOLEH BLOCK DEVICE YANG SEDANG DIGUNAKAN
    // =======================================================

    const currentDeviceId =
      getDeviceId();

    if (
      device.user_id ===
        currentUser?.id &&
      device.device_id ===
        currentDeviceId
    ) {
      setError(
        'Anda tidak dapat memblokir perangkat yang sedang digunakan.'
      );

      return;
    }

    const action =
      device.is_blocked
        ? 'membuka blokir'
        : 'memblokir';

    const confirmed =
      window.confirm(
        `Yakin ingin ${action} perangkat "${device.device_name}"?`
      );

    if (!confirmed) {
      return;
    }

    setDeviceLoading(true);

    setError(null);

    const newBlockedStatus =
      !device.is_blocked;

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
      console.error(error);

      setError(
        `Gagal ${action} perangkat.`
      );

      setDeviceLoading(false);

      return;
    }

    // =======================================================
    // LOG AKTIVITAS
    // =======================================================

    if (currentUser) {
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
              device.device_name
            } - ${
              device.browser
            } - ${
              device.os
            } milik user ${device.user_id}`,
        });
    }

    // =======================================================
    // UPDATE LOCAL STATE
    // =======================================================

    setDevices(
      (current) =>
        current.map(
          (item) =>
            item.id === device.id
              ? {
                  ...item,
                  is_blocked:
                    newBlockedStatus,
                }
              : item
        )
    );

    setDeviceLoading(false);
  };

  // =========================================================
  // DEVICE ICON
  // =========================================================

  const DeviceIcon = ({
    device,
  }: {
    device: UserDevice;
  }) => {
    if (
      device.os
        .toLowerCase()
        .includes('android')
    ) {
      return (
        <Smartphone className="w-5 h-5" />
      );
    }

    if (
      device.os
        .toLowerCase()
        .includes('ios')
    ) {
      return (
        <Smartphone className="w-5 h-5" />
      );
    }

    if (
      device.os
        .toLowerCase()
        .includes('ipad')
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
  // FORMAT LAST ACTIVE
  // =========================================================

  const formatLastActive = (
    value: string
  ) => {
    return new Date(
      value
    ).toLocaleString(
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
  // CHECK ACTIVE
  // =========================================================

  const isRecentlyActive = (
    value: string
  ) => {
    const lastActive =
      new Date(value).getTime();

    const now =
      Date.now();

    return (
      now - lastActive <
      2 * 60 * 1000
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // =========================================================
  // EDITING PROFILE
  // =========================================================

  const editingProfile =
    profiles.find(
      (item) =>
        item.id === editingId
    );

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
            <UserCog className="w-7 h-7" />

            <h1 className="text-2xl font-bold">
              Manajemen User
            </h1>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Kelola pengguna dan perangkat yang digunakan
            untuk mengakses sistem.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />

          Refresh
        </button>

      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle className="w-5 h-5 shrink-0" />

          <p className="text-sm">
            {error}
          </p>

          <button
            onClick={() =>
              setError(null)
            }
            className="ml-auto"
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

            return (
              <div
                key={item.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >

                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">

                      {item.role ===
                      'super_admin' ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : (
                        <Shield className="w-6 h-6" />
                      )}

                    </div>

                    <div>

                      <h3 className="font-semibold text-lg">
                        {item.nama}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1">

                        <span className="text-sm text-gray-500">
                          {item.role ===
                          'super_admin'
                            ? 'Super Admin'
                            : 'Admin'}
                        </span>

                        <span className="text-gray-300">
                          •
                        </span>

                        <span className="text-sm text-gray-500">
                          {userDevices.length}{' '}
                          perangkat
                        </span>

                        {blockedCount >
                          0 && (
                          <>
                            <span className="text-gray-300">
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

                  <button
                    onClick={() =>
                      openEdit(item)
                    }
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition"
                  >
                    Kelola
                  </button>

                </div>

              </div>
            );
          }
        )}

      </div>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {editingId &&
        editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">

              {/* =================================================
                  MODAL HEADER
              ================================================== */}

              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">

                <div>
                  <h2 className="text-xl font-bold">
                    Kelola User
                  </h2>

                  <p className="text-sm text-gray-500">
                    {editingProfile.nama}
                  </p>
                </div>

                <button
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              <div className="space-y-6 p-6">

                {/* =============================================
                    USER DATA
                ============================================== */}

                <div>

                  <h3 className="mb-4 font-semibold">
                    Informasi User
                  </h3>

                  <div className="space-y-4">

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Nama
                      </label>

                      <input
                        value={
                          editNama
                        }
                        onChange={(e) =>
                          setEditNama(
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
                        placeholder="Nama user"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
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
                        className="w-full rounded-lg border px-4 py-2 outline-none"
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

                </div>

                {/* =============================================
                    DEVICE MANAGEMENT
                ============================================== */}

                <div>

                  <div className="mb-4 flex items-center justify-between">

                    <div>
                      <h3 className="font-semibold">
                        Perangkat Login
                      </h3>

                      <p className="text-sm text-gray-500">
                        Blokir perangkat tertentu
                        tanpa memblokir akun user.
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {
                        editingDevices.length
                      }{' '}
                      perangkat
                    </span>

                  </div>

                  {editingDevices.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">

                      <Monitor className="mx-auto mb-3 h-8 w-8 text-gray-400" />

                      <p className="text-sm text-gray-500">
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
                              className={`rounded-xl border p-4 ${
                                device.is_blocked
                                  ? 'border-red-200 bg-red-50'
                                  : 'bg-gray-50'
                              }`}
                            >

                              <div className="flex items-start gap-4">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white border">

                                  <DeviceIcon
                                    device={
                                      device
                                    }
                                  />

                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <h4 className="font-semibold">
                                      {
                                        device.device_name
                                      }
                                    </h4>

                                    {active &&
                                      !device.is_blocked && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                          Aktif
                                        </span>
                                      )}

                                    {device.is_blocked && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                        <Ban className="h-3 w-3" />
                                        Diblokir
                                      </span>
                                    )}

                                    {currentDevice && (
                                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                        Perangkat saat ini
                                      </span>
                                    )}

                                  </div>

                                  <div className="mt-1 text-sm text-gray-600">

                                    {device.browser}
                                    {' • '}
                                    {device.os}

                                  </div>

                                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">

                                    <Clock className="h-3.5 w-3.5" />

                                    Terakhir aktif:{' '}

                                    {formatLastActive(
                                      device.last_active
                                    )}

                                  </div>

                                </div>

                                <button
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
                                      : ''
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
                                      Buka Blokir
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-4 w-4" />
                                      Blokir
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

                </div>

              </div>

              {/* ===============================================
                  MODAL FOOTER
              ================================================ */}

              <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">

                <button
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  onClick={
                    handleSave
                  }
                  disabled={
                    saving
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2 font-medium text-white disabled:opacity-50"
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
