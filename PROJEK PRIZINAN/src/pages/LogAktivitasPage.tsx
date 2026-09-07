import { useEffect, useState } from 'react';
import { FileText, Loader2, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LogAktivitas } from '@/types';

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateStr));
}

function getActionColor(aksi: string): string {
  if (aksi.startsWith('tambah')) {
    return 'bg-primary-50 text-primary-700';
  }

  if (aksi.startsWith('hapus')) {
    return 'bg-red-50 text-red-600';
  }

  if (aksi.startsWith('edit')) {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-stone-100 text-stone-500';
}

function getActionLabel(aksi: string): string {
  const labels: Record<string, string> = {
    tambah_izin: 'Tambah Izin',
    hapus_izin: 'Hapus Izin',

    tambah_santri: 'Tambah Santri',
    edit_santri: 'Edit Santri',
    hapus_santri: 'Hapus Santri',

    tambah_user: 'Tambah User',
    edit_user: 'Edit User',
    hapus_user: 'Hapus User',
  };

  return labels[aksi] ?? aksi;
}

export function LogAktivitasPage() {
  const [logs, setLogs] = useState<LogAktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('log_aktivitas')
        .select(`
          *,
          profiles (
            id,
            nama,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching logs:', error);

        setErrorMessage(
          `Gagal memuat log aktivitas: ${error.message}`
        );

        setLogs([]);
        return;
      }

      setLogs((data ?? []) as LogAktivitas[]);
    } catch (err) {
      console.error(err);

      setErrorMessage('Terjadi kesalahan saat memuat log aktivitas');

      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            Log Aktivitas
          </h1>

          <p className="text-sm text-stone-500 mt-1">
            Riwayat aktivitas pengurus (100 aktivitas terakhir)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>

      /* Empty */
      ) : logs.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">

          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />

          <p className="text-sm">
            Belum ada aktivitas tercatat
          </p>

          <p className="text-xs mt-1">
            Aktivitas seperti menambah atau menghapus izin akan muncul di sini.
          </p>

        </div>

      /* Logs */
      ) : (
        <div className="card divide-y divide-stone-100">

          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 flex items-start gap-3"
            >

              {/* Icon */}
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-stone-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-2 flex-wrap">

                  {/* Action */}
                  <span
                    className={`badge ${getActionColor(log.aksi)}`}
                  >
                    {getActionLabel(log.aksi)}
                  </span>

                  {/* User */}
                  <span className="text-xs text-stone-400">
                    {log.profiles?.nama ?? 'User tidak diketahui'}
                  </span>

                  {/* Role */}
                  {log.profiles?.role && (
                    <span className="text-xs text-stone-300">
                      • {log.profiles.role}
                    </span>
                  )}

                </div>

                {/* Detail */}
                {log.detail && (
                  <p className="text-sm text-stone-600 mt-1">
                    {log.detail}
                  </p>
                )}

                {/* Time */}
                <p className="text-xs text-stone-400 mt-1">
                  {formatTime(log.created_at)}
                </p>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}
