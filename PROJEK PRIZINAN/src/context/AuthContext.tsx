import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { getDeviceId, getDeviceInfo } from '@/lib/device';

import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  authMessage: string | null;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;

  signUp: (
    email: string,
    password: string,
    nama: string
  ) => Promise<{ error: string | null }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);

  const [authMessage, setAuthMessage] = useState<string | null>(
    null
  );

  // =========================================================
  // FETCH PROFILE
  // =========================================================

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error(
          'Error fetching profile:',
          error
        );

        return;
      }

      setProfile(data as Profile | null);
    },
    []
  );

  // =========================================================
  // REFRESH PROFILE
  // =========================================================

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // =========================================================
  // FORCE LOGOUT
  // =========================================================

  const forceLocalLogout = useCallback(
    async (message: string) => {
      setAuthMessage(message);

      setSession(null);

      setUser(null);

      setProfile(null);

      try {
        await supabase.auth.signOut({
          scope: 'local',
        });
      } catch (error) {
        console.error(
          'Local logout error:',
          error
        );
      }
    },
    []
  );

  // =========================================================
  // DEVICE REGISTER
  // =========================================================

  const registerDevice = useCallback(
    async (userId: string) => {
      if (!userId) return;

      const deviceId = getDeviceId();

      const deviceInfo = getDeviceInfo();

      const { error } = await supabase.rpc(
        'register_my_device',
        {
          p_device_id: deviceId,
          p_device_name: deviceInfo.deviceName,
          p_browser: deviceInfo.browser,
          p_os: deviceInfo.os,
        }
      );

      if (error) {
        console.error(
          'Error registering device:',
          error
        );
      }
    },
    []
  );

  // =========================================================
  // CHECK DEVICE BLOCK
  // =========================================================

  const checkDeviceBlocked = useCallback(
    async (
      userId: string
    ): Promise<boolean | null> => {
      if (!userId) return null;

      const deviceId = getDeviceId();

      const { data, error } = await supabase
        .from('user_devices')
        .select('is_blocked')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error) {
        console.error(
          'Error checking device:',
          error
        );

        return null;
      }

      return data?.is_blocked ?? false;
    },
    []
  );

  // =========================================================
  // HEARTBEAT
  // =========================================================

  const heartbeatDevice = useCallback(
    async () => {
      const deviceId = getDeviceId();

      const { error } = await supabase.rpc(
        'heartbeat_my_device',
        {
          p_device_id: deviceId,
        }
      );

      if (error) {
        console.error(
          'Heartbeat error:',
          error
        );
      }
    },
    []
  );

  // =========================================================
  // VERIFY CURRENT USER
  // =========================================================

  const verifyCurrentUser = useCallback(
    async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();

      // =====================================================
      // USER SUDAH TIDAK VALID / AKUN DIHAPUS
      // =====================================================

      if (error || !currentUser) {
        await forceLocalLogout(
          'Sesi Anda sudah tidak valid. Silakan login kembali.'
        );

        return false;
      }

      setUser(currentUser);

      // =====================================================
      // HEARTBEAT DEVICE
      // =====================================================

      await heartbeatDevice();

      // =====================================================
      // CEK DEVICE BLOCK
      // =====================================================

      const blocked =
        await checkDeviceBlocked(
          currentUser.id
        );

      if (blocked === true) {
        await forceLocalLogout(
          'Perangkat ini telah diblokir oleh administrator.'
        );

        return false;
      }

      // =====================================================
      // UPDATE PROFILE
      // =====================================================

      await fetchProfile(
        currentUser.id
      );

      return true;
    },
    [
      forceLocalLogout,
      heartbeatDevice,
      checkDeviceBlocked,
      fetchProfile,
    ]
  );

  // =========================================================
  // INITIAL AUTH
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (!mounted) return;

          if (!session) {
            setSession(null);

            setUser(null);

            setProfile(null);

            setLoading(false);

            return;
          }

          // =================================================
          // VALIDASI USER KE SERVER
          // =================================================

          const {
            data: { user: currentUser },
            error,
          } =
            await supabase.auth.getUser();

          if (
            error ||
            !currentUser
          ) {
            await forceLocalLogout(
              'Akun Anda sudah tidak tersedia. Silakan login kembali.'
            );

            setLoading(false);

            return;
          }

          setSession(session);

          setUser(currentUser);

          // =================================================
          // REGISTER DEVICE
          // =================================================

          await registerDevice(
            currentUser.id
          );

          // =================================================
          // CEK BLOCK
          // =================================================

          const blocked =
            await checkDeviceBlocked(
              currentUser.id
            );

          if (blocked === true) {
            await forceLocalLogout(
              'Perangkat ini telah diblokir oleh administrator.'
            );

            setLoading(false);

            return;
          }

          // =================================================
          // PROFILE
          // =================================================

          await fetchProfile(
            currentUser.id
          );

          setLoading(false);
        } catch (error) {
          console.error(
            'Auth initialization error:',
            error
          );

          setLoading(false);
        }
      };

    initializeAuth();

    // =======================================================
    // AUTH STATE LISTENER
    // =======================================================

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!mounted) return;

          setSession(newSession);

          setUser(
            newSession?.user ??
              null
          );

          if (!newSession) {
            setProfile(null);

            return;
          }

          // Jangan melakukan banyak request
          // langsung di callback Supabase.
          setTimeout(async () => {
            if (!mounted) return;

            await registerDevice(
              newSession.user.id
            );

            const blocked =
              await checkDeviceBlocked(
                newSession.user.id
              );

            if (blocked === true) {
              await forceLocalLogout(
                'Perangkat ini telah diblokir oleh administrator.'
              );

              return;
            }

            await fetchProfile(
              newSession.user.id
            );
          }, 0);
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [
    registerDevice,
    checkDeviceBlocked,
    forceLocalLogout,
    fetchProfile,
  ]);

  // =========================================================
  // AUTO CHECK EVERY 15 SECOND
  // =========================================================

  useEffect(() => {
    if (!user) return;

    const interval =
      window.setInterval(
        async () => {
          await verifyCurrentUser();
        },
        15000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    user,
    verifyCurrentUser,
  ]);

  // =========================================================
  // CHECK KETIKA KEMBALI KE TAB
  // =========================================================

  useEffect(() => {
    const handleFocus =
      async () => {
        if (user) {
          await verifyCurrentUser();
        }
      };

    const handleVisibility =
      async () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          if (user) {
            await verifyCurrentUser();
          }
        }
      };

    window.addEventListener(
      'focus',
      handleFocus
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [
    user,
    verifyCurrentUser,
  ]);

  // =========================================================
  // SIGN IN
  // =========================================================

  const signIn = async (
    email: string,
    password: string
  ) => {
    setAuthMessage(null);

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      return {
        error:
          error.message,
      };
    }

    // =======================================================
    // VALIDASI USER SETELAH LOGIN
    // =======================================================

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !currentUser
    ) {
      await forceLocalLogout(
        'Akun tidak dapat divalidasi.'
      );

      return {
        error:
          'Akun tidak dapat divalidasi.',
      };
    }

    // =======================================================
    // REGISTER DEVICE
    // =======================================================

    await registerDevice(
      currentUser.id
    );

    // =======================================================
    // CEK BLOCK
    // =======================================================

    const blocked =
      await checkDeviceBlocked(
        currentUser.id
      );

    if (blocked === true) {
      await forceLocalLogout(
        'Perangkat ini telah diblokir oleh administrator.'
      );

      return {
        error:
          'Perangkat ini telah diblokir oleh administrator.',
      };
    }

    return {
      error: null,
    };
  };

  // =========================================================
  // SIGN UP
  // =========================================================

  const signUp = async (
    email: string,
    password: string,
    nama: string
  ) => {
    setAuthMessage(null);

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama,
          },
        },
      });

    return {
      error:
        error?.message ??
        null,
    };
  };

  // =========================================================
  // SIGN OUT
  // =========================================================

  const signOut = async () => {
    await supabase.auth.signOut();

    setSession(null);

    setUser(null);

    setProfile(null);

    setAuthMessage(null);
  };

  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        authMessage,
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

// ===========================================================
// HOOK
// ===========================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
