import {
  useEffect,
  useState,
  useCallback,
} from 'react';

import {
  FileText,
  Loader2,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

import type {
  LogAktivitas,
} from '@/types';


// ========================================
// FORMAT WAKTU
// ========================================

function formatTime(
  dateStr: string | null | undefined
) {

  if (!dateStr) {

    return '-';

  }


  try {

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }
    ).format(
      new Date(dateStr)
    );

  } catch {

    return '-';

  }

}


// ========================================
// WARNA BADGE AKTIVITAS
// ========================================

function getActionColor(
  aksi: string
): string {

  if (
    aksi.startsWith(
      'tambah'
    )
  ) {

    return 'bg-primary-50 text-primary-700';

  }


  if (
    aksi.startsWith(
      'hapus'
    )
  ) {

    return 'bg-red-50 text-red-600';

  }


  if (
    aksi.startsWith(
      'edit'
    )
  ) {

    return 'bg-amber-50 text-amber-700';

  }


  return 'bg-stone-100 text-stone-500';

}


// ========================================
// LABEL AKTIVITAS
// ========================================

function getActionLabel(
  aksi: string
): string {

  const labels:
    Record<string, string> = {


      // =====================
      // IZIN
      // =====================

      tambah_izin:
        'Tambah Izin',

      hapus_izin:
        'Hapus Izin',

      edit_izin:
        'Edit Izin',


      // =====================
      // SANTRI
      // =====================

      tambah_santri:
        'Tambah Santri',

      edit_santri:
        'Edit Santri',

      hapus_santri:
        'Hapus Santri',


      // =====================
      // USER
      // =====================

      tambah_user:
        'Tambah User',

      edit_user:
        'Edit User',

      hapus_user:
        'Hapus User',

    };


  return (
    labels[aksi] ??
    aksi
  );

}


// ========================================
// HALAMAN LOG AKTIVITAS
// ========================================

export function LogAktivitasPage() {


  // ======================================
  // STATE
  // ======================================

  const [
    logs,
    setLogs,
  ] = useState<
    LogAktivitas[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(
    true
  );


  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(
    null
  );


  // ======================================
  // AMBIL DATA LOG
  // ======================================

  const fetchLogs =
    useCallback(
      async () => {


        setLoading(
          true
        );


        setErrorMessage(
          null
        );


        try {


          const {
            data,
            error,
          } =
            await supabase
              .from(
                'log_aktivitas'
              )
              .select(`
                id,
                user_id,
                aksi,
                target_id,
                detail,
                created_at,
                profiles (
                  id,
                  nama,
                  role,
                  created_at
                )
              `)
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )
              .limit(
                100
              );


          // ===============================
          // JIKA TERJADI ERROR
          // ===============================

          if (
            error
          ) {

            console.error(
              'Error mengambil log aktivitas:',
              error
            );


            setErrorMessage(
              `Gagal memuat log aktivitas: ${error.message}`
            );


            setLogs(
              []
            );


            return;

          }


          // ===============================
          // SIMPAN DATA
          // ===============================

          setLogs(
            (
              data ??
              []
            ) as LogAktivitas[]
          );


        } catch (
          err
        ) {


          console.error(
            'Terjadi kesalahan:',
            err
          );


          setErrorMessage(
            'Terjadi kesalahan saat memuat log aktivitas'
          );


          setLogs(
            []
          );


        } finally {


          setLoading(
            false
          );


        }


      },
      []
    );


  // ======================================
  // LOAD DATA AWAL
  // ======================================

  useEffect(
    () => {

      fetchLogs();

    },
    [
      fetchLogs,
    ]
  );


  // ======================================
  // REALTIME SUPABASE
  // ======================================

  useEffect(
    () => {


      const channel =
        supabase
          .channel(
            'log-aktivitas-changes'
          )
          .on(
            'postgres_changes',
            {
              event:
                '*',

              schema:
                'public',

              table:
                'log_aktivitas',
            },

            () => {

              fetchLogs();

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
      fetchLogs,
    ]
  );


  // ======================================
  // TAMPILAN
  // ======================================

  return (

    <div className="space-y-5 animate-fade-in">


      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex items-start justify-between gap-3">


        <div>


          <h1 className="text-2xl font-bold text-stone-800">

            Log Aktivitas

          </h1>


          <p className="text-sm text-stone-500 mt-1">

            Riwayat aktivitas pengurus
            (100 aktivitas terakhir)

          </p>


        </div>



        {/* BUTTON REFRESH */}

        <button

          type="button"

          onClick={
            fetchLogs
          }

          disabled={
            loading
          }

          className="btn-secondary flex items-center gap-2"

        >


          <RefreshCw

            className={`w-4 h-4 ${
              loading
                ? 'animate-spin'
                : ''
            }`}

          />


          <span>

            Refresh

          </span>


        </button>


      </div>



      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {
        errorMessage && (

          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">


            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />


            <div>


              <p className="text-sm font-semibold text-red-700">

                Terjadi Kesalahan

              </p>


              <p className="text-sm text-red-600 mt-1">

                {
                  errorMessage
                }

              </p>


            </div>


          </div>

        )
      }



      {/* ================================= */}
      {/* LOADING */}
      {/* ================================= */}

      {
        loading ? (

          <div className="flex flex-col items-center justify-center py-16 gap-3">


            <Loader2 className="w-7 h-7 animate-spin text-stone-400" />


            <p className="text-sm text-stone-400">

              Memuat log aktivitas...

            </p>


          </div>

        ) : logs.length ===
          0 ? (


          /* =============================== */
          /* BELUM ADA LOG */
          /* =============================== */

          <div className="card p-10 text-center">


            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />


            <p className="font-semibold text-stone-600">

              Belum Ada Aktivitas

            </p>


            <p className="text-sm text-stone-400 mt-1 max-w-sm mx-auto">

              Aktivitas pengurus seperti
              menambah, mengubah, atau
              menghapus data akan tercatat
              dan muncul di halaman ini.

            </p>


            <button

              type="button"

              onClick={
                fetchLogs
              }

              className="btn-secondary mt-5"

            >


              <RefreshCw className="w-4 h-4" />


              Coba Refresh


            </button>


          </div>


        ) : (


          /* =============================== */
          /* DAFTAR LOG */
          /* =============================== */

          <div className="card divide-y divide-stone-100">


            {
              logs.map(
                (
                  log
                ) => (

                  <div

                    key={
                      log.id
                    }

                    className="p-4 flex items-start gap-3"

                  >


                    {/* ICON */}

                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">


                      <Clock className="w-4 h-4 text-stone-400" />


                    </div>



                    {/* CONTENT */}

                    <div className="flex-1 min-w-0">


                      {/* AKSI DAN USER */}

                      <div className="flex items-center gap-2 flex-wrap">


                        {/* BADGE AKSI */}

                        <span

                          className={`badge ${getActionColor(
                            log.aksi
                          )}`}

                        >


                          {
                            getActionLabel(
                              log.aksi
                            )
                          }


                        </span>



                        {/* NAMA USER */}

                        <span className="text-xs text-stone-500">


                          {
                            log.profiles
                              ?.nama
                              ??
                            'User tidak diketahui'
                          }


                        </span>



                        {/* ROLE */}

                        {
                          log.profiles
                            ?.role && (

                            <span className="text-xs text-stone-400">


                              • {
                                log.profiles
                                  .role
                              }


                            </span>

                          )
                        }


                      </div>



                      {/* DETAIL */}

                      {
                        log.detail && (

                          <p className="text-sm text-stone-600 mt-1">


                            {
                              log.detail
                            }


                          </p>

                        )
                      }



                      {/* WAKTU */}

                      <p className="text-xs text-stone-400 mt-2">


                        {
                          formatTime(
                            log.created_at
                          )
                        }


                      </p>


                    </div>


                  </div>

                )
              )
            }


          </div>

        )
      }


    </div>

  );

}
