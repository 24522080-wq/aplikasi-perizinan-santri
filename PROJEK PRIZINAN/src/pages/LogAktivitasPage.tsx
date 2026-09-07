import { useEffect, useState } from 'react';
import { FileText, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LogAktivitas } from '@/types';

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateStr));
}

function getActionColor(aksi: string): string {
  if (aksi.startsWith('tambah')) return 'bg-primary-50 text-primary-700';
  if (aksi.startsWith('hapus')) return 'bg-red-50 text-red-600';
  if (aksi.startsWith('edit')) return 'bg-amber-50 text-amber-700';
  return 'bg-stone-100 text-stone-500';
}

function getActionLabel(aksi: string): string {
  const labels: Record<string, string> = {
    tambah_izin: 'Tambah Izin',
    hapus_izin: 'Hapus Izin',
    tambah_santri: 'Tambah Santri',
    edit_santri: 'Edit Santri',
    hapus_santri: 'Hapus Santri',
    edit_user: 'Edit User',
  };
  return labels[aksi] ?? aksi;
}

export function LogAktivitasPage() {
  const [logs, setLogs] = useState<LogAktivitas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('log_aktivitas')
        .select('*, profiles(*)')
        .order('waktu', { ascending: false })
        .limit(100);
      if (error) {
        console.error('Error fetching logs:', error);
      } else {
        setLogs(data as LogAktivitas[]);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Log Aktivitas</h1>
        <p className="text-sm text-stone-500 mt-1">Riwayat aktivitas pengurus (100 terakhir)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada aktivitas tercatat</p>
        </div>
      ) : (
        <div className="card divide-y divide-stone-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${getActionColor(log.aksi)}`}>
                    {getActionLabel(log.aksi)}
                  </span>
                  <span className="text-xs text-stone-400">
                    {log.profiles?.nama || 'Unknown'}
                  </span>
                </div>
                <p className="text-sm text-stone-600 mt-1">{log.detail}</p>
                <p className="text-xs text-stone-400 mt-1">{formatTime(log.waktu)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
