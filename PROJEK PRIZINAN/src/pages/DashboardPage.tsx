import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Users, FileText, Calendar, Sun, Moon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Santri, Izin } from '@/types';

function getTodayStr() {
  const tz = Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  return tz.format(new Date());
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateStr + 'T00:00:00+07:00'));
}

export function DashboardPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [todayIzin, setTodayIzin] = useState<Izin[]>([]);
  const [weekIzin, setWeekIzin] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayStr();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekStart = sevenDaysAgo.toISOString().split('T')[0];

    Promise.all([
      supabase.from('santri').select('*').then(({ data }) => data as Santri[] ?? []),
      supabase
        .from('izin')
        .select('*, santri(*)')
        .eq('tanggal', today)
        .then(({ data }) => data as Izin[] ?? []),
      supabase
        .from('izin')
        .select('*, santri(*)')
        .gte('tanggal', weekStart)
        .lte('tanggal', today)
        .then(({ data }) => data as Izin[] ?? []),
    ]).then(([santri, todayI, weekI]) => {
      setSantriList(santri);
      setTodayIzin(todayI);
      setWeekIzin(weekI);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const totalSantri = santriList.filter((s) => s.status === 'Aktif').length;
    const todayMaghrib = todayIzin.filter((i) => i.kegiatan === 'Maghrib').length;
    const todaySubuh = todayIzin.filter((i) => i.kegiatan === 'Subuh').length;
    const totalTodayIzin = todayIzin.length;

    const last7 = getLast7Days();
    const chartData = last7.map((date) => {
      const dayIzin = weekIzin.filter((i) => i.tanggal === date);
      return {
        date,
        label: formatShortDate(date),
        maghrib: dayIzin.filter((i) => i.kegiatan === 'Maghrib').length,
        subuh: dayIzin.filter((i) => i.kegiatan === 'Subuh').length,
      };
    });

    const maxChart = Math.max(...chartData.map((d) => Math.max(d.maghrib, d.subuh)), 1);

    // Top izin (most frequent)
    const izinCountBySantri = new Map<string, { nama: string; count: number }>();
    weekIzin.forEach((izin) => {
      const existing = izinCountBySantri.get(izin.santri_id);
      if (existing) {
        existing.count++;
      } else if (izin.santri) {
        izinCountBySantri.set(izin.santri_id, { nama: izin.santri.nama_lengkap, count: 1 });
      }
    });
    const topIzin = Array.from(izinCountBySantri.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSantri,
      todayMaghrib,
      todaySubuh,
      totalTodayIzin,
      chartData,
      maxChart,
      topIzin,
    };
  }, [santriList, todayIzin, weekIzin]);

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
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">Ringkasan perizinan santri</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{stats.totalSantri}</p>
              <p className="text-xs text-stone-500">Santri Aktif</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{stats.totalTodayIzin}</p>
              <p className="text-xs text-stone-500">Izin Hari Ini</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Sun className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{stats.todayMaghrib}</p>
              <p className="text-xs text-stone-500">Izin Maghrib</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{stats.todaySubuh}</p>
              <p className="text-xs text-stone-500">Izin Subuh</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-stone-400" />
          <h2 className="font-bold text-stone-800 text-sm">Tren Izin 7 Hari Terakhir</h2>
        </div>

        <div className="flex items-end justify-between gap-2 h-40">
          {stats.chartData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex justify-center gap-1 items-end h-28">
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-orange-400 transition-all duration-500"
                  style={{ height: `${(d.maghrib / stats.maxChart) * 100}%`, minHeight: d.maghrib > 0 ? '4px' : '0' }}
                  title={`Maghrib: ${d.maghrib}`}
                />
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-indigo-400 transition-all duration-500"
                  style={{ height: `${(d.subuh / stats.maxChart) * 100}%`, minHeight: d.subuh > 0 ? '4px' : '0' }}
                  title={`Subuh: ${d.subuh}`}
                />
              </div>
              <span className="text-[10px] text-stone-400 font-medium">{d.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-400" />
            <span className="text-xs text-stone-500">Maghrib</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-indigo-400" />
            <span className="text-xs text-stone-500">Subuh</span>
          </div>
        </div>
      </div>

      {/* Top izin list */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-stone-400" />
          <h2 className="font-bold text-stone-800 text-sm">Santri Terbanyak Izin (7 Hari)</h2>
        </div>

        {stats.topIzin.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">Belum ada data izin minggu ini</p>
        ) : (
          <div className="space-y-2">
            {stats.topIzin.map((item, idx) => {
              const maxCount = stats.topIzin[0].count;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 w-5">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-stone-700 truncate">{item.nama}</span>
                      <span className="text-xs font-semibold text-stone-500">{item.count}x</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full transition-all duration-500"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
