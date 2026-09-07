import { useEffect, useState, useMemo, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  Users,
  AlertCircle,
  Phone,
  MessageCircle,
  MapPin,
  GraduationCap,
  Home,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Santri, SantriStatus } from '@/types';

const emptyForm: Omit<Santri, 'id' | 'created_at' | 'updated_at'> = {
  nis: '',
  nama_lengkap: '',
  asal_kota: '',
  universitas: '',
  kamar: '',
  wa_santri: '',
  wa_wali: '',
  telegram_wali: '',
  status: 'Aktif',
  foto_url: '',
};

export function DataSantriPage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SantriStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Santri | null>(null);

  const fetchSantri = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('santri')
      .select('*')
      .order('nama_lengkap', { ascending: true });
    if (error) {
      setError('Gagal memuat data santri');
    } else {
      setSantriList(data as Santri[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSantri();
  }, []);

  const filteredSantri = useMemo(() => {
    let list = santriList;
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.nama_lengkap.toLowerCase().includes(q) ||
          s.nis.includes(q) ||
          s.asal_kota.toLowerCase().includes(q) ||
          s.universitas.toLowerCase().includes(q)
      );
    }
    return list;
  }, [santriList, search, statusFilter]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (santri: Santri) => {
    setForm({
      nis: santri.nis,
      nama_lengkap: santri.nama_lengkap,
      asal_kota: santri.asal_kota,
      universitas: santri.universitas,
      kamar: santri.kamar,
      wa_santri: santri.wa_santri,
      wa_wali: santri.wa_wali,
      telegram_wali: santri.telegram_wali,
      status: santri.status,
      foto_url: santri.foto_url,
    });
    setEditingId(santri.id);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.nis.trim() || !form.nama_lengkap.trim()) {
      setError('NIS dan Nama Lengkap harus diisi');
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('santri')
          .update(form)
          .eq('id', editingId);
        if (error) throw error;

        await supabase.from('log_aktivitas').insert({
          user_id: profile?.id,
          aksi: 'edit_santri',
          target_id: editingId,
          detail: `Mengubah data santri ${form.nama_lengkap}`,
        });
      } else {
        const { error } = await supabase.from('santri').insert(form);
        if (error) throw error;

        await supabase.from('log_aktivitas').insert({
          user_id: profile?.id,
          aksi: 'tambah_santri',
          target_id: '',
          detail: `Menambah santri ${form.nama_lengkap}`,
        });
      }
      setModalOpen(false);
      fetchSantri();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('santri').delete().eq('id', deleteConfirm.id);
      if (error) throw error;

      await supabase.from('log_aktivitas').insert({
        user_id: profile?.id,
        aksi: 'hapus_santri',
        target_id: deleteConfirm.id,
        detail: `Menghapus santri ${deleteConfirm.nama_lengkap}`,
      });
      setDeleteConfirm(null);
      fetchSantri();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Data Santri</h1>
          <p className="text-sm text-stone-500 mt-1">Kelola data master santri</p>
        </div>
        {isSuperAdmin && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Santri
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Anda dapat melihat data santri. Hanya Super Admin yang dapat menambah, mengubah, dan menghapus.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIS, kota, universitas..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl">
          {(['all', 'Aktif', 'Nonaktif', 'Alumni'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === s ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
              }`}
            >
              {s === 'all' ? 'Semua' : s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : filteredSantri.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tidak ada santri yang ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSantri.map((santri) => (
            <div key={santri.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 flex-shrink-0">
                  {santri.nama_lengkap.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-sm truncate">{santri.nama_lengkap}</p>
                  <p className="text-xs text-stone-400">NIS: {santri.nis}</p>
                </div>
                <span className={`badge ${
                  santri.status === 'Aktif'
                    ? 'bg-primary-50 text-primary-700'
                    : santri.status === 'Nonaktif'
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {santri.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-stone-500">
                {santri.asal_kota && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {santri.asal_kota}
                  </div>
                )}
                {santri.universitas && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                    {santri.universitas}
                  </div>
                )}
                {santri.kamar && (
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-stone-400" />
                    Kamar {santri.kamar}
                  </div>
                )}
                {santri.wa_santri && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    WA: {santri.wa_santri}
                  </div>
                )}
                {santri.wa_wali && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                    Wali: {santri.wa_wali}
                  </div>
                )}
              </div>

              {isSuperAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => openEdit(santri)}
                    className="btn-ghost flex-1 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(santri)}
                    className="btn-ghost flex-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-b-none sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-800">
                {editingId ? 'Edit Santri' : 'Tambah Santri'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-stone-100">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">NIS *</label>
                  <input
                    type="text"
                    value={form.nis}
                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as SantriStatus })}
                    className="input-field"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Nama Lengkap *</label>
                <input
                  type="text"
                  value={form.nama_lengkap}
                  onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Asal Kota</label>
                  <input
                    type="text"
                    value={form.asal_kota}
                    onChange={(e) => setForm({ ...form, asal_kota: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">Universitas</label>
                  <input
                    type="text"
                    value={form.universitas}
                    onChange={(e) => setForm({ ...form, universitas: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Jenis Kamar</label>
                <select
                  value={form.kamar}
                  onChange={(e) => setForm({ ...form, kamar: e.target.value })}
                  className="input-field"
                >
                  <option value="">- Pilih -</option>
                  <option value="Sendiri">Sendiri</option>
                  <option value="Berdua">Berdua</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">WA Santri</label>
                  <input
                    type="text"
                    value={form.wa_santri}
                    onChange={(e) => setForm({ ...form, wa_santri: e.target.value })}
                    className="input-field"
                    placeholder="08xxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">WA Wali</label>
                  <input
                    type="text"
                    value={form.wa_wali}
                    onChange={(e) => setForm({ ...form, wa_wali: e.target.value })}
                    className="input-field"
                    placeholder="08xxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Telegram Wali</label>
                <input
                  type="text"
                  value={form.telegram_wali}
                  onChange={(e) => setForm({ ...form, telegram_wali: e.target.value })}
                  className="input-field"
                  placeholder="@username"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="card p-5 w-full max-w-sm animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-stone-800 text-center mb-2">Hapus Santri?</h3>
            <p className="text-sm text-stone-500 text-center mb-5">
              Yakin ingin menghapus <strong>{deleteConfirm.nama_lengkap}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
