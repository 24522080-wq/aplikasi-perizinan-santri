import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

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
  AlertCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

import { useAuth } from '@/context/AuthContext';

import type {
  Santri,
  Izin,
  IzinKegiatan,
} from '@/types';


// ========================================
// FORMAT TANGGAL HARI INI
// ========================================

function getTodayStr(): string {

  const date =
    new Date();


  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Asia/Jakarta',

      year:
        'numeric',

      month:
        '2-digit',

      day:
        '2-digit',
    }
  ).format(
    date
  );

}


// ========================================
// FORMAT TANGGAL INDONESIA
// ========================================

function formatDateID(
  dateStr: string
): string {

  if (!dateStr) {

    return '-';

  }


  try {

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric',

        timeZone:
          'Asia/Jakarta',
      }
    ).format(
      new Date(
        `${dateStr}T00:00:00+07:00`
      )
    );

  } catch {

    return dateStr;

  }

}


// ========================================
// FORMAT WAKTU INDONESIA
// ========================================

function formatDateTimeID(
  dateStr:
    | string
    | null
    | undefined
): string {

  if (!dateStr) {

    return '-';

  }


  try {

    return new Intl.DateTimeFormat(
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
        dateStr
      )
    );

  } catch {

    return '-';

  }

}


// ========================================
// HALAMAN CATAT IZIN
// ========================================

export function CatatIzinPage() {


  // ======================================
  // AUTH
  // ======================================

  const {
    profile,
  } =
    useAuth();


  // ======================================
  // STATE DATA SANTRI
  // ======================================

  const [
    santriList,
    setSantriList,
  ] =
    useState<
      Santri[]
    >(
      []
    );


  // ======================================
  // STATE DATA IZIN
  // ======================================

  const [
    izinMap,
    setIzinMap,
  ] =
    useState<
      Map<
        string,
        Izin
      >
    >(
      new Map()
    );


  // ======================================
  // STATE PENCARIAN
  // ======================================

  const [
    search,
    setSearch,
  ] =
    useState(
      ''
    );


  // ======================================
  // STATE TANGGAL
  // ======================================

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      getTodayStr()
    );


  // ======================================
  // STATE KEGIATAN
  // ======================================

  const [
    selectedKegiatan,
    setSelectedKegiatan,
  ] =
    useState<
      IzinKegiatan
    >(
      'Maghrib'
    );


  // ======================================
  // STATE LOADING
  // ======================================

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  // ======================================
  // STATE LOADING AKSI
  // ======================================

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      string
      | null
    >(
      null
    );


  // ======================================
  // STATE ERROR
  // ======================================

  const [
    error,
    setError,
  ] =
    useState<
      string
      | null
    >(
      null
    );


  // ======================================
  // STATE DETAIL IZIN
  // ======================================

  const [
    detailIzin,
    setDetailIzin,
  ] =
    useState<
      Izin
      | null
    >(
      null
    );


  // ======================================
  // FILTER STATUS
  // ======================================

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState<
      'all'
      | 'Aktif'
    >(
      'Aktif'
    );


  // ========================================
  // AMBIL DATA SANTRI
  // ========================================

  const fetchSantri =
    useCallback(
      async () => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'santri'
            )
            .select(
              '*'
            )
            .order(
              'nama_lengkap',
              {
                ascending:
                  true,
              }
            );


        if (
          error
        ) {

          console.error(
            'Error mengambil data santri:',
            error
          );


          throw new Error(
            `Gagal memuat data santri: ${error.message}`
          );

        }


        setSantriList(
          (
            data ??
            []
          ) as Santri[]
        );

      },
      []
    );


  // ========================================
  // AMBIL DATA IZIN
  // ========================================

  const fetchIzin =
    useCallback(
      async () => {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'izin'
            )
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


        if (
          error
        ) {

          console.error(
            'Error mengambil data izin:',
            error
          );


          throw new Error(
            `Gagal memuat data izin: ${error.message}`
          );

        }


        const map =
          new Map<
            string,
            Izin
          >();


        (
          (
            data ??
            []
          ) as Izin[]
        ).forEach(
          (
            izin
          ) => {

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


  // ========================================
  // LOAD DATA HALAMAN
  // ========================================

  const loadData =
    useCallback(
      async () => {

        setLoading(
          true
        );


        setError(
          null
        );


        try {

          await Promise.all(
            [
              fetchSantri(),
              fetchIzin(),
            ]
          );

        } catch (
          err
        ) {

          console.error(
            'Error memuat halaman:',
            err
          );


          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat data'
          );

        } finally {

          setLoading(
            false
          );

        }

      },
      [
        fetchSantri,
        fetchIzin,
      ]
    );


  // ========================================
  // LOAD PERTAMA
  // ========================================

  useEffect(
    () => {

      loadData();

    },
    [
      loadData,
    ]
  );


  // ========================================
  // REALTIME SUPABASE
  // ========================================

  useEffect(
    () => {

      const channel =
        supabase
          .channel(
            `izin-changes-${selectedDate}-${selectedKegiatan}`
          )
          .on(
            'postgres_changes',
            {
              event:
                '*',

              schema:
                'public',

              table:
                'izin',
            },
            () => {

              fetchIzin()
                .catch(
                  (
                    err
                  ) => {

                    console.error(
                      'Realtime izin error:',
                      err
                    );

                  }
                );

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
      fetchIzin,
      selectedDate,
      selectedKegiatan,
    ]
  );


  // ========================================
  // TAMBAH ATAU HAPUS IZIN
  // ========================================

  const toggleIzin =
    async (
      santri: Santri
    ) => {


      // ==================================
      // VALIDASI PROFILE
      // ==================================

      if (
        !profile?.id
      ) {

        setError(
          'Data pengguna tidak ditemukan. Silakan login kembali.'
        );

        return;

      }


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


        // ==================================
        // HAPUS IZIN
        // ==================================

        if (
          existing
        ) {


          const {
            error:
              deleteError,
          } =
            await supabase
              .from(
                'izin'
              )
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


          // ==================================
          // SIMPAN LOG HAPUS IZIN
          // ==================================

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
                    profile.id,

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
              'Gagal mencatat log hapus izin:',
              logError
            );

          }

        }


        // ==================================
        // TAMBAH IZIN
        // ==================================

        else {


          const {
            data,
            error:
              insertError,
          } =
            await supabase
              .from(
                'izin'
              )
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
                    profile.id,
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


          // ==================================
          // SIMPAN LOG TAMBAH IZIN
          // ==================================

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
                    profile.id,

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
              'Gagal mencatat log tambah izin:',
              logError
            );

          }

        }


        // ==================================
        // REFRESH DATA IZIN
        // ==================================

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
            : 'Terjadi kesalahan saat mengubah data izin'
        );

      } finally {

        setActionLoading(
          null
        );

      }

    };


  // ========================================
  // FILTER DATA SANTRI
  // ========================================

  const filteredSantri =
    useMemo(
      () => {


        let list =
          [
            ...santriList
          ];


        // ==================================
        // FILTER STATUS
        // ==================================

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


        // ==================================
        // PENCARIAN
        // ==================================

        const q =
          search
            .trim()
            .toLowerCase();


        if (
          q
        ) {

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
                    santri.asal_kota ??
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      q
                    )

                  ||

                  (
                    santri.universitas ??
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      q
                    )

                  ||

                  (
                    santri.kamar ??
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


  // ========================================
  // STATISTIK SANTRI AKTIF
  // ========================================

  const activeSantriIds =
    useMemo(
      () => {

        return new Set(
          santriList
            .filter(
              (
                santri
              ) =>
                santri.status ===
                'Aktif'
            )
            .map(
              (
                santri
              ) =>
                santri.id
            )
        );

      },
      [
        santriList,
      ]
    );


  // ========================================
  // TOTAL SANTRI AKTIF
  // ========================================

  const totalSantri =
    activeSantriIds.size;


  // ========================================
  // TOTAL IZIN SANTRI AKTIF
  // ========================================

  const izinCount =
    useMemo(
      () => {

        return Array
          .from(
            izinMap.keys()
          )
          .filter(
            (
              santriId
            ) =>
              activeSantriIds.has(
                santriId
              )
          )
          .length;

      },
      [
        izinMap,
        activeSantriIds,
      ]
    );


  // ========================================
  // TOTAL HADIR
  // ========================================

  const hadirCount =
    Math.max(
      0,
      totalSantri -
      izinCount
    );


  // ========================================
  // TAMPILAN HALAMAN
  // ========================================

  return (

    <div className="space-y-5 animate-fade-in">


      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

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



      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {
        error && (

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">


            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />


            <div className="flex-1">


              <p className="text-sm font-semibold text-red-700">

                Terjadi Kesalahan

              </p>


              <p className="text-sm text-red-600 mt-1">

                {error}

              </p>


            </div>


            <button
              onClick={
                () =>
                  setError(
                    null
                  )
              }
              className="text-red-400 hover:text-red-600"
              title="Tutup"
            >

              <X className="w-4 h-4" />

            </button>


          </div>

        )
      }



      {/* ================================= */}
      {/* TANGGAL DAN KEGIATAN */}
      {/* ================================= */}

      <div className="card p-4">


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

                value={
                  selectedDate
                }

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

                type="button"

                onClick={
                  () =>
                    setSelectedKegiatan(
                      'Maghrib'
                    )
                }

                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                  selectedKegiatan ===
                  'Maghrib'

                    ? 'bg-amber-50 text-amber-700 border-amber-300'

                    : 'bg-stone-50 text-stone-500 border-transparent hover:bg-stone-100'
                }`}

              >

                <Sun className="w-4 h-4" />

                Maghrib

              </button>



              {/* SUBUH */}

              <button

                type="button"

                onClick={
                  () =>
                    setSelectedKegiatan(
                      'Subuh'
                    )
                }

                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                  selectedKegiatan ===
                  'Subuh'

                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'

                    : 'bg-stone-50 text-stone-500 border-transparent hover:bg-stone-100'
                }`}

              >

                <Moon className="w-4 h-4" />

                Subuh

              </button>


            </div>


          </div>


        </div>


      </div>



      {/* ================================= */}
      {/* STATISTIK */}
      {/* ================================= */}

      <div className="grid grid-cols-3 gap-3">


        {/* TOTAL */}

        <div className="card p-4 text-center">


          <p className="text-2xl font-bold text-stone-800">

            {totalSantri}

          </p>


          <p className="text-xs text-stone-500 mt-1">

            Total Santri

          </p>


        </div>



        {/* HADIR */}

        <div className="card p-4 text-center bg-primary-50/50 border-primary-200/60">


          <p className="text-2xl font-bold text-primary-700">

            {hadirCount}

          </p>


          <p className="text-xs text-primary-600 mt-1">

            Hadir

          </p>


        </div>



        {/* IZIN */}

        <div className="card p-4 text-center bg-amber-50/50 border-amber-200/60">


          <p className="text-2xl font-bold text-amber-700">

            {izinCount}

          </p>


          <p className="text-xs text-amber-600 mt-1">

            Izin

          </p>


        </div>


      </div>



      {/* ================================= */}
      {/* SEARCH DAN FILTER */}
      {/* ================================= */}

      <div className="flex gap-2">


        {/* SEARCH */}

        <div className="relative flex-1">


          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />


          <input

            type="text"

            value={
              search
            }

            onChange={
              (
                e
              ) =>
                setSearch(
                  e.target.value
                )
            }

            placeholder="Cari nama, NIS, kota, universitas, kamar..."

            className="input-field pl-10"

          />


        </div>



        {/* FILTER */}

        <button

          type="button"

          onClick={
            () =>
              setFilterStatus(
                filterStatus ===
                'Aktif'

                  ? 'all'

                  : 'Aktif'
              )
          }

          className={`btn-secondary flex items-center gap-2 ${
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



      {/* ================================= */}
      {/* DAFTAR SANTRI */}
      {/* ================================= */}

      {
        loading ? (

          <div className="flex flex-col items-center justify-center py-16 gap-3">


            <Loader2 className="w-7 h-7 animate-spin text-stone-400" />


            <p className="text-sm text-stone-400">

              Memuat data santri...

            </p>


          </div>

        ) : filteredSantri.length ===
          0 ? (

          <div className="card p-10 text-center">


            <Info className="w-10 h-10 mx-auto mb-3 text-stone-300" />


            <p className="font-semibold text-stone-600">

              Data Tidak Ditemukan

            </p>


            <p className="text-sm text-stone-400 mt-1">

              Tidak ada santri yang sesuai
              dengan pencarian atau filter.

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
                            ?.charAt(
                              0
                            )
                            ?.toUpperCase() ??
                          '?'
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

                            type="button"

                            onClick={
                              () =>
                                setDetailIzin(
                                  izin
                                )
                            }

                            className="btn-ghost p-1.5"

                            title="Lihat detail izin"

                          >

                            <Info className="w-4 h-4" />

                          </button>

                        )
                      }



                      {/* TOMBOL IZIN */}

                      <button

                        type="button"

                        onClick={
                          () =>
                            toggleIzin(
                              santri
                            )
                        }

                        disabled={
                          isLoading
                        }

                        title={
                          isIzin
                            ? 'Hapus izin'
                            : 'Catat izin'
                        }

                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-60 ${
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



      {/* ================================= */}
      {/* MODAL DETAIL IZIN */}
      {/* ================================= */}

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


              {/* HEADER MODAL */}

              <div className="flex items-center justify-between mb-5">


                <h3 className="font-bold text-stone-800">

                  Detail Izin

                </h3>


                <button

                  type="button"

                  onClick={
                    () =>
                      setDetailIzin(
                        null
                      )
                  }

                  className="btn-ghost p-1.5"

                  title="Tutup"

                >

                  <X className="w-4 h-4" />

                </button>


              </div>



              {/* DATA DETAIL */}

              <div className="space-y-4 text-sm">


                {/* SANTRI */}

                <div>


                  <span className="text-xs text-stone-400">

                    Santri

                  </span>


                  <p className="font-semibold text-stone-700 mt-0.5">

                    {
                      detailIzin
                        .santri
                        ?.nama_lengkap ??
                      '-'
                    }

                  </p>


                </div>



                {/* TANGGAL */}

                <div>


                  <span className="text-xs text-stone-400">

                    Tanggal

                  </span>


                  <p className="font-semibold text-stone-700 mt-0.5">

                    {
                      formatDateID(
                        detailIzin.tanggal
                      )
                    }

                  </p>


                </div>



                {/* KEGIATAN */}

                <div>


                  <span className="text-xs text-stone-400">

                    Kegiatan

                  </span>


                  <p className="font-semibold text-stone-700 mt-0.5">

                    {
                      detailIzin.kegiatan
                    }

                  </p>


                </div>



                {/* KETERANGAN */}

                {
                  detailIzin.keterangan && (

                    <div>


                      <span className="text-xs text-stone-400">

                        Keterangan

                      </span>


                      <p className="font-semibold text-stone-700 mt-0.5">

                        {
                          detailIzin.keterangan
                        }

                      </p>


                    </div>

                  )
                }



                {/* WAKTU DICATAT */}

                <div>


                  <span className="text-xs text-stone-400">

                    Dicatat Pada

                  </span>


                  <p className="font-semibold text-stone-700 mt-0.5">

                    {
                      formatDateTimeID(
                        detailIzin.dicatat_pada
                      )
                    }

                  </p>


                </div>


              </div>



              {/* TOMBOL TUTUP */}

              <button

                type="button"

                onClick={
                  () =>
                    setDetailIzin(
                      null
                    )
                }

                className="btn-secondary w-full mt-6"

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
