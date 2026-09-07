import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, Download, Loader2, FileText, Sun, Moon, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Santri, Izin, IzinKegiatan } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDateID(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateStr + 'T00:00:00+07:00'));
}

function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(dateStr + 'T00:00:00+07:00'));
}

type ViewMode = 'harian' | 'rentang';

export function RekapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('harian');
  const [selectedDate, setSelectedDate] = useState(() => {
    return Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  });
  const [kegiatanFilter, setKegiatanFilter] = useState<IzinKegiatan | 'all'>('all');
  const [search, setSearch] = useState('');
  const [izinList, setIzinList] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchIzin = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('izin').select('*, santri(*)');

    if (viewMode === 'harian') {
      query = query.eq('tanggal', selectedDate);
    } else {
      query = query.gte('tanggal', startDate).lte('tanggal', endDate);
    }

    if (kegiatanFilter !== 'all') {
      query = query.eq('kegiatan', kegiatanFilter);
    }

    const { data, error } = await query.order('tanggal', { ascending: false }).order('kegiatan');
    if (error) {
      console.error('Error fetching izin:', error);
      setIzinList([]);
    } else {
      setIzinList(data as Izin[]);
    }
    setLoading(false);
  }, [viewMode, selectedDate, startDate, endDate, kegiatanFilter]);

  useEffect(() => {
    fetchIzin();
  }, [fetchIzin]);

  const filteredIzin = useMemo(() => {
    if (!search.trim()) return izinList;
    const q = search.toLowerCase();
    return izinList.filter(
      (i) =>
        i.santri?.nama_lengkap.toLowerCase().includes(q) ||
        i.santri?.nis.includes(q)
    );
  }, [izinList, search]);

  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      const periodeText =
        viewMode === 'harian'
          ? `Tanggal: ${formatDateShort(selectedDate)}`
          : `Periode: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;

      const kegiatanText = kegiatanFilter === 'all' ? 'Semua' : kegiatanFilter;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Rekap Perizinan Santri', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(periodeText, 14, 28);
      doc.text(`Kegiatan: ${kegiatanText}`, 14, 34);
      doc.text(`Total: ${filteredIzin.length} izin`, 14, 40);
      doc.text(`Dicetak: ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date())}`, 14, 46);

      const tableData = filteredIzin.map((izin, idx) => [
        idx + 1,
        izin.santri?.nis ?? '-',
        izin.santri?.nama_lengkap ?? '-',
        izin.santri?.asal_kota ?? '-',
        formatDateShort(izin.tanggal),
        izin.kegiatan,
        izin.keterangan || '-',
      ]);

      autoTable(doc, {
        head: [['No', 'NIS', 'Nama', 'Asal Kota', 'Tanggal', 'Kegiatan', 'Keterangan']],
        body: tableData,
        startY: 52,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [245, 252, 244] },
      });

      doc.save(`rekap-izin-${viewMode === 'harian' ? selectedDate : `${startDate}-${endDate}`}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Rekap Izin</h1>
          <p className="text-sm text-stone-500 mt-1">Rekap dan ekspor data perizinan</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting || filteredIzin.length === 0}
          className="btn-primary"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengekspor...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* Filter controls */}
      <div className="card p-4 space-y-4">
        {/* View mode toggle */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setViewMode('harian')}
            className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'harian' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => setViewMode('rentang')}
            className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'rentang' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'
            }`}
          >
            Rentang Tanggal
          </button>
        </div>

        {/* Date inputs */}
        {viewMode === 'harian' ? (
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Dari Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5">Sampai Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Kegiatan filter */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 mb-1.5">Kegiatan</label>
          <div className="flex gap-2">
            <button
              onClick={() => setKegiatanFilter('all')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'all'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setKegiatanFilter('Maghrib')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'Maghrib'
                  ? 'bg-orange-50 text-orange-700 border-2 border-orange-300'
                  : 'bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100'
              }`}
            >
              <Sun className="w-4 h-4" />
              Maghrib
            </button>
            <button
              onClick={() => setKegiatanFilter('Subuh')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'Subuh'
                  ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300'
                  : 'bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100'
              }`}
            >
              <Moon className="w-4 h-4" />
              Subuh
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau NIS santri..."
          className="input-field pl-10"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <FileText className="w-4 h-4" />
        <span>{filteredIzin.length} izin ditemukan</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : filteredIzin.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">
          <p className="text-sm">Tidak ada data izin pada periode ini</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold">No</th>
                  <th className="text-left px-4 py-3 font-semibold">NIS</th>
                  <th className="text-left px-4 py-3 font-semibold">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold">Asal Kota</th>
                  <th className="text-left px-4 py-3 font-semibold">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold">Kegiatan</th>
                  <th className="text-left px-4 py-3 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredIzin.map((izin, idx) => (
                  <tr key={izin.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 text-stone-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-stone-600">{izin.santri?.nis ?? '-'}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{izin.santri?.nama_lengkap ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-500">{izin.santri?.asal_kota ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-500">{formatDateShort(izin.tanggal)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        izin.kegiatan === 'Maghrib'
                          ? 'bg-orange-50 text-orange-700'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {izin.kegiatan === 'Maghrib' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                        {izin.kegiatan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 max-w-[200px] truncate">{izin.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-stone-100">
            {filteredIzin.map((izin, idx) => (
              <div key={izin.id} className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{izin.santri?.nama_lengkap ?? '-'}</p>
                    <p className="text-xs text-stone-400">{izin.santri?.nis ?? '-'} · {izin.santri?.asal_kota ?? '-'}</p>
                  </div>
                  <span className={`badge ${
                    izin.kegiatan === 'Maghrib'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {izin.kegiatan}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-stone-400">{formatDateID(izin.tanggal)}</span>
                  {izin.keterangan && <span className="text-xs text-stone-500 truncate ml-2">{izin.keterangan}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
