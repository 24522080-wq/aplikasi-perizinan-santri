import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    nama: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mencegah pengecekan user berjalan bersamaan
  const checkingUserRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    setProfile(data as Profile | null);

    return data as Profile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  /**
   * Mengecek apakah user yang sedang login
   * masih benar-benar ada di Supabase Auth.
   *
   * getSession() hanya membaca session yang tersimpan.
   * getUser() melakukan validasi ke Auth server.
   */
  const verifyCurrentUser = useCallback(async () => {
    if (checkingUserRef.current) return;

    checkingUserRef.current = true;

    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      // User sudah dihapus / session tidak valid
      if (error || !currentUser) {
        console.warn(
          'User tidak valid atau sudah dihapus. Melakukan logout...'
        );

        await supabase.auth.signOut({ scope: 'local' });

        setSession(null);
        setUser(null);
        setProfile(null);

        return;
      }

      // Pastikan state user tetap sesuai dengan Auth server
      setUser(currentUser);

      // Ambil session terbaru dari client
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      // Ambil profile terbaru
      await fetchProfile(currentUser.id);
    } catch (error) {
      console.error('Gagal memverifikasi user:', error);
    } finally {
      checkingUserRef.current = false;
    }
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Cek session pertama kali aplikasi dibuka
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Validasi bahwa user masih ada
          const {
            data: { user: currentUser },
            error,
          } = await supabase.auth.getUser();

          if (error || !currentUser) {
            await supabase.auth.signOut({ scope: 'local' });

            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            await fetchProfile(currentUser.id);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Dengarkan perubahan authentication
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (!newSession?.user) {
          setProfile(null);
        } else {
          // Jalankan setelah callback selesai
          setTimeout(() => {
            if (mounted) {
              fetchProfile(newSession.user.id);
            }
          }, 0);
        }
      }
    );

    /**
     * Cek ulang setiap 15 detik.
     *
     * Jika akun dihapus dari Supabase Dashboard,
     * perangkat yang masih membuka aplikasi akan
     * terdeteksi dan otomatis logout.
     */
    const interval = window.setInterval(() => {
      if (mounted) {
        verifyCurrentUser();
      }
    }, 15000);

    /**
     * Cek ketika browser kembali aktif.
     * Misalnya user pindah tab lalu kembali ke aplikasi.
     */
    const handleFocus = () => {
      if (mounted) {
        verifyCurrentUser();
      }
    };

    window.addEventListener('focus', handleFocus);

    /**
     * Cek ketika tab kembali terlihat.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        verifyCurrentUser();
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();

      window.clearInterval(interval);

      window.removeEventListener('focus', handleFocus);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [fetchProfile, verifyCurrentUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      error: error?.message ?? null,
    };
  };

  const signUp = async (
    email: string,
    password: string,
    nama: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama,
        },
      },
    });

    return {
      error: error?.message ?? null,
    };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error saat logout:', error);
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
