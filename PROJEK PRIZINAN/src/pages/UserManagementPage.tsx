import { useEffect, useState } from 'react';
import { UserCog, Loader2, ShieldCheck, Shield, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Profile, UserRole } from '@/types';

export function UserManagementPage() {
  const { profile: currentUser, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('admin');
  const [editNama, setEditNama] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      setError('Gagal memuat data pengguna');
    } else {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditRole(p.role);
    setEditNama(p.nama);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole, nama: editNama })
        .eq('id', editingId);
      if (error) throw error;

      await supabase.from('log_aktivitas').insert({
        user_id: currentUser?.id,
        aksi: 'edit_user',
        target_id: editingId,
        detail: `Mengubah user: nama=${editNama}, role=${editRole}`,
      });

      setModalOpen(false);
      fetchProfiles();
      if (editingId === currentUser?.id) {
        refreshProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Manajemen User</h1>
        <p className="text-sm text-stone-500 mt-1">Kelola pengguna dan role pengurus</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                p.role === 'super_admin'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-stone-100 text-stone-500'
              }`}>
                {p.nama?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-sm truncate">
                  {p.nama || '(Tanpa nama)'}
                </p>
                <p className="text-xs text-stone-400 truncate">
                  {p.id === currentUser?.id ? 'Anda' : 'User'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`badge ${
                p.role === 'super_admin'
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-stone-100 text-stone-500'
              }`}>
                {p.role === 'super_admin' ? (
                  <>
                    <ShieldCheck className="w-3 h-3" />
                    Super Admin
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3" />
                    Admin
                  </>
                )}
              </span>
              <button
                onClick={() => openEdit(p)}
                className="btn-ghost text-xs"
              >
                <UserCog className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="card w-full max-w-sm p-5 animate-slide-up rounded-b-none sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-800">Edit Pengguna</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Nama</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Role</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditRole('admin')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      editRole === 'admin'
                        ? 'bg-stone-100 text-stone-700 border-2 border-stone-300'
                        : 'bg-stone-50 text-stone-400 border-2 border-transparent'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                  <button
                    onClick={() => setEditRole('super_admin')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      editRole === 'super_admin'
                        ? 'bg-primary-50 text-primary-700 border-2 border-primary-300'
                        : 'bg-stone-50 text-stone-400 border-2 border-transparent'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Super Admin
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
