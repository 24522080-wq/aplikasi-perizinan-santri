import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Download,
  Loader2,
  FileText,
  Sun,
  Moon,
  Search,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { Izin, IzinKegiatan } from '@/types';

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

type RekapSantri = {
  santri_id: number | string;
  nis: string;
  nama_lengkap: string;
  asal_kota: string;
  jumlah_izin: number;
};

export function RekapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('harian');

  const [selectedDate, setSelectedDate] = useState(() => {
    return Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });

  const [kegiatanFilter, setKegiatanFilter] =
    useState<IzinKegiatan | 'all'>('all');

  const [search, setSearch] = useState('');

  const [izinList, setIzinList] = useState<Izin[]>([]);

  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  /*
  ============================
  AMBIL DATA IZIN
  ============================
  */

  const fetchIzin = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('izin')
      .select(`
        *,
        santri (*)
      `);

    /*
    ============================
    FILTER TANGGAL
    ============================
    */

    if (viewMode === 'harian') {
      query = query.eq('tanggal', selectedDate);
    } else {
      query = query
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
    }

    /*
    ============================
    FILTER KEGIATAN
    ============================
    */

    if (kegiatanFilter !== 'all') {
      query = query.eq('kegiatan', kegiatanFilter);
    }

    const { data, error } = await query
      .order('tanggal', {
        ascending: false,
      });

    if (error) {
      console.error('Error fetching izin:', error);

      setIzinList([]);
    } else {
      setIzinList(data as Izin[]);
    }

    setLoading(false);
  }, [
    viewMode,
    selectedDate,
    startDate,
    endDate,
    kegiatanFilter,
  ]);

  useEffect(() => {
    fetchIzin();
  }, [fetchIzin]);

  /*
  ============================
  KELOMPOKKAN IZIN BERDASARKAN SANTRI
  ============================

  Contoh:

  YOLAN
  - izin 1
  - izin 2
  - izin 3

  Menjadi:

  YOLAN | 3 izin
  */

  const rekapSantri = useMemo(() => {
    const map = new Map<string, RekapSantri>();

    izinList.forEach((izin) => {
      const santri = izin.santri;

      if (!santri) return;

      const key = String(izin.santri_id);

      const existing = map.get(key);

      if (existing) {
        existing.jumlah_izin += 1;
      } else {
        map.set(key, {
          santri_id: izin.santri_id,
          nis: santri.nis ?? '-',
          nama_lengkap: santri.nama_lengkap ?? '-',
          asal_kota: santri.asal_kota ?? '-',
          jumlah_izin: 1,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.jumlah_izin - a.jumlah_izin
    );
  }, [izinList]);

  /*
  ============================
  SEARCH
  ============================
  */

  const filteredRekap = useMemo(() => {
    if (!search.trim()) {
      return rekapSantri;
    }

    const q = search.toLowerCase();

    return rekapSantri.filter(
      (santri) =>
        santri.nama_lengkap.toLowerCase().includes(q) ||
        santri.nis.toLowerCase().includes(q) ||
        santri.asal_kota.toLowerCase().includes(q)
    );
  }, [rekapSantri, search]);

  /*
  ============================
  EXPORT PDF
  ============================
  */

  const exportPDF = () => {
    setExporting(true);

    try {
      const doc = new jsPDF();

      const periodeText =
        viewMode === 'harian'
          ? `Tanggal: ${formatDateShort(selectedDate)}`
          : `Periode: ${formatDateShort(
              startDate
            )} - ${formatDateShort(endDate)}`;

      const kegiatanText =
        kegiatanFilter === 'all'
          ? 'Semua Kegiatan'
          : kegiatanFilter;

      /*
      ============================
      JUDUL PDF
      ============================
      */

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');

      doc.text(
        'REKAP JUMLAH IZIN SANTRI',
        14,
        20
      );

      /*
      ============================
      INFORMASI PDF
      ============================
      */

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      doc.text(
        periodeText,
        14,
        28
      );

      doc.text(
        `Kegiatan: ${kegiatanText}`,
        14,
        34
      );

      doc.text(
        `Jumlah Santri Berizin: ${filteredRekap.length} santri`,
        14,
        40
      );

      const totalIzin = filteredRekap.reduce(
        (total, item) => total + item.jumlah_izin,
        0
      );

      doc.text(
        `Total Seluruh Izin: ${totalIzin} izin`,
        14,
        46
      );

      /*
      ============================
      DATA TABEL PDF
      ============================
      */

      const tableData = filteredRekap.map(
        (santri, index) => [
          index + 1,
          santri.nis,
          santri.nama_lengkap,
          santri.jumlah_izin,
        ]
      );

      /*
      ============================
      TABEL PDF
      ============================
      */

      autoTable(doc, {
        head: [
          [
            'No',
            'NIS',
            'Nama Santri',
            'Jumlah Izin',
          ],
        ],

        body: tableData,

        startY: 52,

        styles: {
          fontSize: 9,
          cellPadding: 3,
        },

        headStyles: {
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },

        alternateRowStyles: {
          fillColor: [245, 252, 244],
        },

        columnStyles: {
          0: {
            cellWidth: 15,
          },

          1: {
            cellWidth: 35,
          },

          2: {
            cellWidth: 90,
          },

          3: {
            cellWidth: 35,
            halign: 'center',
          },
        },
      });

      /*
      ============================
      SIMPAN PDF
      ============================
      */

      const filename =
        viewMode === 'harian'
          ? `rekap-jumlah-izin-${selectedDate}.pdf`
          : `rekap-jumlah-izin-${startDate}-${endDate}.pdf`;

      doc.save(filename);
    } catch (err) {
      console.error(
        'PDF export error:',
        err
      );
    } finally {
      setExporting(false);
    }
  };

  /*
  ============================
  TOTAL IZIN
  ============================
  */

  const totalIzin = filteredRekap.reduce(
    (total, item) =>
      total + item.jumlah_izin,
    0
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* HEADER */}

      <div className="flex items-center justify-between flex-wrap gap-3">

        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            Rekap Izin
          </h1>

          <p className="text-sm text-stone-500 mt-1">
            Rekap jumlah izin setiap santri
          </p>
        </div>

        <button
          onClick={exportPDF}
          disabled={
            exporting ||
            filteredRekap.length === 0
          }
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


      {/* FILTER */}

      <div className="card p-4 space-y-4">

        {/* MODE */}

        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-full sm:w-fit">

          <button
            onClick={() =>
              setViewMode('harian')
            }
            className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'harian'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500'
            }`}
          >
            Harian
          </button>

          <button
            onClick={() =>
              setViewMode('rentang')
            }
            className={`flex-1 sm:flex-initial px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              viewMode === 'rentang'
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500'
            }`}
          >
            Rentang Tanggal
          </button>

        </div>


        {/* TANGGAL */}

        {viewMode === 'harian' ? (

          <div>

            <label className="block text-xs font-semibold text-stone-500 mb-1.5">
              Tanggal
            </label>

            <div className="relative">

              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
                className="input-field pl-10"
              />

            </div>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3">

            <div>

              <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                Dari Tanggal
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                className="input-field"
              />

            </div>


            <div>

              <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                Sampai Tanggal
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                className="input-field"
              />

            </div>

          </div>

        )}


        {/* KEGIATAN */}

        <div>

          <label className="block text-xs font-semibold text-stone-500 mb-1.5">
            Kegiatan
          </label>

          <div className="flex gap-2">

            <button
              onClick={() =>
                setKegiatanFilter('all')
              }
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'all'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-50 text-stone-500'
              }`}
            >
              Semua
            </button>


            <button
              onClick={() =>
                setKegiatanFilter(
                  'Maghrib'
                )
              }
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'Maghrib'
                  ? 'bg-orange-50 text-orange-700 border-2 border-orange-300'
                  : 'bg-stone-50 text-stone-500'
              }`}
            >

              <Sun className="w-4 h-4" />

              Maghrib

            </button>


            <button
              onClick={() =>
                setKegiatanFilter(
                  'Subuh'
                )
              }
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                kegiatanFilter === 'Subuh'
                  ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-300'
                  : 'bg-stone-50 text-stone-500'
              }`}
            >

              <Moon className="w-4 h-4" />

              Subuh

            </button>

          </div>

        </div>

      </div>


      {/* SEARCH */}

      <div className="relative">

        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Cari nama, NIS, atau asal kota..."
          className="input-field pl-10"
        />

      </div>


      {/* SUMMARY */}

      <div className="grid grid-cols-2 gap-3">

        <div className="card p-4">

          <p className="text-2xl font-bold text-primary-700">
            {filteredRekap.length}
          </p>

          <p className="text-xs text-stone-500">
            Santri Berizin
          </p>

        </div>


        <div className="card p-4">

          <p className="text-2xl font-bold text-amber-600">
            {totalIzin}
          </p>

          <p className="text-xs text-stone-500">
            Total Izin
          </p>

        </div>

      </div>


      {/* TABEL */}

      {loading ? (

        <div className="flex items-center justify-center py-12">

          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />

        </div>

      ) : filteredRekap.length === 0 ? (

        <div className="card p-8 text-center text-stone-400">

          <p className="text-sm">
            Tidak ada data izin pada periode ini
          </p>

        </div>

      ) : (

        <div className="card overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="bg-stone-50 text-stone-500 text-xs">

                  <th className="text-left px-4 py-3">
                    No
                  </th>

                  <th className="text-left px-4 py-3">
                    NIS
                  </th>

                  <th className="text-left px-4 py-3">
                    Nama Santri
                  </th>

                  <th className="text-center px-4 py-3">
                    Jumlah Izin
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-stone-100">

                {filteredRekap.map(
                  (santri, index) => (

                    <tr
                      key={
                        santri.santri_id
                      }
                      className="hover:bg-stone-50 transition-colors"
                    >

                      <td className="px-4 py-3 text-stone-400">

                        {index + 1}

                      </td>


                      <td className="px-4 py-3 font-medium text-stone-600">

                        {santri.nis}

                      </td>


                      <td className="px-4 py-3 font-semibold text-stone-800">

                        {santri.nama_lengkap}

                      </td>


                      <td className="px-4 py-3 text-center">

                        <span className="inline-flex items-center justify-center min-w-8 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">

                          {santri.jumlah_izin}

                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>
  );
}
