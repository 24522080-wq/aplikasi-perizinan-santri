import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Check,
  X,
  Loader2,
  Calendar,
  Sun,
  Moon,
  Info,
  Filter,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Santri, Izin, IzinKegiatan } from '@/types';


// =========================
// FORMAT TANGGAL HARI INI
// =========================

function getTodayStr() {
  const date = new Date();

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}


// =========================
// FORMAT TANGGAL INDONESIA
// =========================

function formatDateID(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(`${dateStr}T00:00:00+07:00`)
  );
}


// =========================
// HALAMAN CATAT IZIN
// =========================

export function CatatIzinPage() {

  const { profile } = useAuth();


  // =========================
  // STATE
  // =========================

  const [santriList, setSantriList] =
    useState<Santri[]>([]);

  const [izinMap, setIzinMap] =
    useState<Map<string, Izin>>(
      new Map()
    );

  const [search, setSearch] =
    useState('');

  const [selectedDate, setSelectedDate] =
    useState(
      getTodayStr()
    );

  const [selectedKegiatan, setSelectedKegiatan] =
    useState<IzinKegiatan>(
      'Maghrib'
    );

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [detailIzin, setDetailIzin] =
    useState<Izin | null>(
      null
    );

  const [filterStatus, setFilterStatus] =
    useState<'all' | 'Aktif'>(
      'Aktif'
    );


  // =========================
  // AMBIL DATA SANTRI
  // =========================

  const fetchSantri =
    useCallback(
      async () => {

        setError(null);

        const {
          data,
          error,
        } = await supabase
          .from('santri')
          .select('*')
          .order(
            'nama_lengkap',
            {
              ascending: true,
            }
          );


        if (error) {

          console.error(
            'Error fetch santri:',
            error
          );

          setError(
            `Gagal memuat data santri: ${error.message}`
          );

          return;

        }


        setSantriList(
          (data || []) as Santri[]
        );

      },
      []
    );


  // =========================
  // AMBIL DATA IZIN
  // =========================

  const fetchIzin =
    useCallback(
      async () => {

        const {
          data,
          error,
        } = await supabase
          .from('izin')
          .select(
            '*, santri(*)'
          )
          .eq(
            'tanggal',
            selectedDate
          )
          .eq(
            'kegiatan',
            selectedKegiatan
          );


        if (error) {

          console.error(
            'Error fetch izin:',
            error
          );

          setError(
            `Gagal memuat data izin: ${error.message}`
          );

          return;

        }


        const map =
          new Map<
            string,
            Izin
          >();


        (
          (data || []) as Izin[]
        ).forEach(
          (izin) => {

            map.set(
              izin.santri_id,
              izin
            );

          }
        );


        setIzinMap(
          map
        );

      },
      [
        selectedDate,
        selectedKegiatan,
      ]
    );


  // =========================
  // LOAD DATA AWAL
  // =========================

  useEffect(
    () => {

      const loadData =
        async () => {

          setLoading(
            true
          );


          await Promise.all(
            [
              fetchSantri(),
              fetchIzin(),
            ]
          );


          setLoading(
            false
          );

        };


      loadData();

    },
    [
      fetchSantri,
      fetchIzin,
    ]
  );


  // =========================
  // REALTIME IZIN
  // =========================

  useEffect(
    () => {

      const channel =
        supabase
          .channel(
            'izin-changes'
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'izin',
            },
            () => {

              fetchIzin();

            }
          )
          .subscribe();


      return () => {

        supabase.removeChannel(
          channel
        );

      };

    },
    [
      fetchIzin
    ]
  );


  // =========================
  // TAMBAH / HAPUS IZIN
  // =========================

  const toggleIzin =
    async (
      santri: Santri
    ) => {

      const key =
        santri.id;


      const existing =
        izinMap.get(
          key
        );


      setActionLoading(
        key
      );


      setError(
        null
      );


      try {


        // =====================
        // HAPUS IZIN
        // =====================

        if (existing) {


          const {
            error:
              deleteError,
          } =
            await supabase
              .from('izin')
              .delete()
              .eq(
                'id',
                existing.id
              );


          if (
            deleteError
          ) {

            throw deleteError;

          }


          // =====================
          // CATAT LOG HAPUS IZIN
          // =====================

          const {
            error:
              logError,
          } =
            await supabase
              .from(
                'log_aktivitas'
              )
              .insert(
                {
                  user_id:
                    profile?.id ??
                    null,

                  aksi:
                    'hapus_izin',

                  target_id:
                    existing.id,

                  detail:
                    `Menghapus izin ${santri.nama_lengkap} - ` +
                    `${selectedKegiatan} - ${selectedDate}`,
                }
              );


          if (
            logError
          ) {

            console.error(
              'Gagal mencatat log:',
              logError
            );


            throw new Error(
              `Izin berhasil dihapus, tetapi log gagal dicatat: ${logError.message}`
            );

          }

        }


        // =====================
        // TAMBAH IZIN
        // =====================

        else {


          const {
            data,
            error:
              insertError,
          } =
            await supabase
              .from('izin')
              .insert(
                {
                  santri_id:
                    santri.id,

                  tanggal:
                    selectedDate,

                  kegiatan:
                    selectedKegiatan,

                  keterangan:
                    '',

                  dicatat_oleh:
                    profile?.id ??
                    null,
                }
              )
              .select(
                '*, santri(*)'
              )
              .single();


          if (
            insertError
          ) {

            throw insertError;

          }


          // =====================
          // CATAT LOG TAMBAH IZIN
          // =====================

          const {
            error:
              logError,
          } =
            await supabase
              .from(
                'log_aktivitas'
              )
              .insert(
                {
                  user_id:
                    profile?.id ??
                    null,

                  aksi:
                    'tambah_izin',

                  target_id:
                    data.id,

                  detail:
                    `Menambah izin ${santri.nama_lengkap} - ` +
                    `${selectedKegiatan} - ${selectedDate}`,
                }
              );


          if (
            logError
          ) {

            console.error(
              'Gagal mencatat log:',
              logError
            );


            throw new Error(
              `Izin berhasil ditambahkan, tetapi log gagal dicatat: ${logError.message}`
            );

          }

        }


        // =====================
        // REFRESH DATA IZIN
        // =====================

        await fetchIzin();


      } catch (
        err
      ) {


        console.error(
          'Toggle izin error:',
          err
        );


        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan'
        );


      } finally {


        setActionLoading(
          null
        );

      }

    };


  // =========================
  // FILTER SANTRI
  // =========================

  const filteredSantri =
    useMemo(
      () => {

        let list =
          santriList;


        // =====================
        // FILTER STATUS
        // =====================

        if (
          filterStatus ===
          'Aktif'
        ) {

          list =
            list.filter(
              (
                santri
              ) =>
                santri.status ===
                'Aktif'
            );

        }


        // =====================
        // SEARCH
        // =====================

        if (
          search.trim()
        ) {

          const q =
            search
              .toLowerCase();


          list =
            list.filter(
              (
                santri
              ) => {

                return (

                  santri.nama_lengkap
                    .toLowerCase()
                    .includes(
                      q
                    )

                  ||

                  String(
                    santri.nis
                  )
                    .toLowerCase()
                    .includes(
                      q
                    )

                  ||

                  (
                    santri.asal_kota ||
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      q
                    )

                  ||

                  (
                    santri.universitas ||
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      q
                    )

                );

              }
            );

        }


        return list;

      },
      [
        santriList,
        search,
        filterStatus,
      ]
    );


  // =========================
  // STATISTIK
  // =========================

  const izinCount =
    izinMap.size;


  const totalSantri =
    santriList
      .filter(
        (
          santri
        ) =>
          santri.status ===
          'Aktif'
      )
      .length;


  const hadirCount =
    Math.max(
      0,
      totalSantri -
      izinCount
    );


  // =========================
  // TAMPILAN
  // =========================

  return (

    <div className="space-y-5 animate-fade-in">


      {/* HEADER */}

      <div>

        <h1 className="text-2xl font-bold text-stone-800">

          Catat Izin

        </h1>


        <p className="text-sm text-stone-500 mt-1">

          {
            formatDateID(
              selectedDate
            )
          }

        </p>

      </div>



      {/* ERROR */}

      {
        error && (

          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">

            <Info className="w-4 h-4 flex-shrink-0" />

            <span>

              {error}

            </span>

          </div>

        )
      }



      {/* TANGGAL DAN KEGIATAN */}

      <div className="card p-4 space-y-4">

        <div className="flex flex-col sm:flex-row gap-4">


          {/* TANGGAL */}

          <div className="flex-1">

            <label className="block text-xs font-semibold text-stone-500 mb-1.5">

              Tanggal

            </label>


            <div className="relative">

              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />


              <input
                type="date"
                value={selectedDate}

                onChange={
                  (
                    e
                  ) =>
                    setSelectedDate(
                      e.target.value
                    )
                }

                className="input-field pl-10"
              />

            </div>

          </div>



          {/* KEGIATAN */}

          <div className="flex-1">

            <label className="block text-xs font-semibold text-stone-500 mb-1.5">

              Kegiatan

            </label>


            <div className="flex gap-2">


              {/* MAGHRIB */}

              <button

                onClick={
                  () =>
                    setSelectedKegiatan(
                      'Maghrib'
                    )
                }

                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedKegiatan ===
                  'Maghrib'

                    ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'

                    : 'bg-stone-50 text-stone-500 border-2 border-transparent hover:bg-stone-100'
                }`}

              >

                <Sun className="w-4 h-4" />

                Maghrib

              </button>



              {/* SUBUH */}

              <button

                onClick={
                  () =>
                    setSelectedKegiatan(
                      'Subuh'
                    )
                }

                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedKegiatan ===
                  'Subuh'

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

      </div>



      {/* STATISTIK */}

      <div className="grid grid-cols-3 gap-3">


        <div className="card p-4 text-center">

          <p className="text-2xl font-bold text-stone-800">

            {totalSantri}

          </p>

          <p className="text-xs text-stone-500 mt-0.5">

            Total Santri

          </p>

        </div>



        <div className="card p-4 text-center bg-primary-50/50 border-primary-200/60">

          <p className="text-2xl font-bold text-primary-700">

            {hadirCount}

          </p>

          <p className="text-xs text-primary-600 mt-0.5">

            Hadir

          </p>

        </div>



        <div className="card p-4 text-center bg-amber-50/50 border-amber-200/60">

          <p className="text-2xl font-bold text-amber-700">

            {izinCount}

          </p>

          <p className="text-xs text-amber-600 mt-0.5">

            Izin

          </p>

        </div>


      </div>



      {/* SEARCH DAN FILTER */}

      <div className="flex gap-2">


        <div className="relative flex-1">

          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />


          <input

            type="text"

            value={search}

            onChange={
              (
                e
              ) =>
                setSearch(
                  e.target.value
                )
            }

            placeholder="Cari nama, NIS, kota, universitas..."

            className="input-field pl-10"

          />

        </div>



        <button

          onClick={
            () =>

              setFilterStatus(

                filterStatus ===
                'Aktif'

                  ? 'all'

                  : 'Aktif'

              )
          }

          className={`btn-secondary ${
            filterStatus ===
            'Aktif'

              ? 'bg-primary-50 text-primary-700 border-primary-200'

              : ''
          }`}

        >

          <Filter className="w-4 h-4" />

          {
            filterStatus ===
            'Aktif'

              ? 'Aktif'

              : 'Semua'
          }

        </button>


      </div>



      {/* DAFTAR SANTRI */}

      {
        loading ? (

          <div className="flex items-center justify-center py-12">

            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />

          </div>

        ) : filteredSantri.length ===
          0 ? (

          <div className="card p-8 text-center text-stone-400">

            <p className="text-sm">

              Tidak ada santri yang ditemukan

            </p>

          </div>

        ) : (

          <div className="space-y-2">


            {
              filteredSantri.map(
                (
                  santri
                ) => {

                  const izin =
                    izinMap.get(
                      santri.id
                    );


                  const isIzin =
                    Boolean(
                      izin
                    );


                  const isLoading =
                    actionLoading ===
                    santri.id;


                  return (

                    <div

                      key={
                        santri.id
                      }

                      className={`card p-3.5 flex items-center gap-3 transition-all ${
                        isIzin

                          ? 'bg-amber-50/40 border-amber-200/60'

                          : ''
                      }`}

                    >


                      {/* INISIAL */}

                      <div

                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                          isIzin

                            ? 'bg-amber-100 text-amber-700'

                            : 'bg-stone-100 text-stone-500'
                        }`}

                      >

                        {
                          santri.nama_lengkap
                            .charAt(0)
                            .toUpperCase()
                        }

                      </div>



                      {/* DATA SANTRI */}

                      <div className="flex-1 min-w-0">


                        <div className="flex items-center gap-2">


                          <p className="font-semibold text-stone-800 text-sm truncate">

                            {
                              santri.nama_lengkap
                            }

                          </p>


                          {
                            santri.status !==
                            'Aktif' && (

                              <span className="badge bg-stone-100 text-stone-500">

                                {
                                  santri.status
                                }

                              </span>

                            )
                          }


                        </div>



                        <p className="text-xs text-stone-400 truncate">

                          {santri.nis}

                          {' · '}

                          {
                            santri.asal_kota ||
                            '-'
                          }

                          {' · '}

                          {
                            santri.universitas ||
                            '-'
                          }

                        </p>


                      </div>



                      {/* DETAIL IZIN */}

                      {
                        izin && (

                          <button

                            onClick={
                              () =>
                                setDetailIzin(
                                  izin
                                )
                            }

                            className="btn-ghost p-1.5"

                            title="Detail izin"

                          >

                            <Info className="w-4 h-4" />

                          </button>

                        )
                      }



                      {/* TOMBOL IZIN */}

                      <button

                        onClick={
                          () =>
                            toggleIzin(
                              santri
                            )
                        }

                        disabled={
                          isLoading
                        }

                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                          isIzin

                            ? 'bg-amber-500 text-white hover:bg-amber-600'

                            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                        }`}

                      >

                        {
                          isLoading ? (

                            <Loader2 className="w-5 h-5 animate-spin" />

                          ) : isIzin ? (

                            <X className="w-5 h-5" />

                          ) : (

                            <Check className="w-5 h-5" />

                          )
                        }

                      </button>


                    </div>

                  );

                }
              )
            }


          </div>

        )
      }



      {/* MODAL DETAIL IZIN */}

      {
        detailIzin && (

          <div

            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in"

            onClick={
              () =>
                setDetailIzin(
                  null
                )
            }

          >


            <div

              className="card p-5 w-full max-w-sm animate-scale-in"

              onClick={
                (
                  e
                ) =>
                  e.stopPropagation()
              }

            >


              <h3 className="font-bold text-stone-800 mb-4">

                Detail Izin

              </h3>



              <div className="space-y-3 text-sm">


                <div>

                  <span className="text-stone-400">

                    Santri

                  </span>


                  <p className="font-semibold text-stone-700">

                    {
                      detailIzin
                        .santri
                        ?.nama_lengkap
                    }

                  </p>

                </div>



                <div>

                  <span className="text-stone-400">

                    Tanggal

                  </span>


                  <p className="font-semibold text-stone-700">

                    {
                      formatDateID(
                        detailIzin.tanggal
                      )
                    }

                  </p>

                </div>



                <div>

                  <span className="text-stone-400">

                    Kegiatan

                  </span>


                  <p className="font-semibold text-stone-700">

                    {
                      detailIzin.kegiatan
                    }

                  </p>

                </div>



                <div>

                  <span className="text-stone-400">

                    Dicatat pada

                  </span>


                  <p className="font-semibold text-stone-700">

                    {
                      new Intl.DateTimeFormat(
                        'id-ID',
                        {
                          dateStyle:
                            'medium',

                          timeStyle:
                            'short',

                          timeZone:
                            'Asia/Jakarta',
                        }
                      ).format(
                        new Date(
                          detailIzin.dicatat_pada
                        )
                      )
                    }

                  </p>

                </div>


              </div>



              <button

                onClick={
                  () =>
                    setDetailIzin(
                      null
                    )
                }

                className="btn-secondary w-full mt-5"

              >

                Tutup

              </button>


            </div>


          </div>

        )
      }


    </div>

  );

}
