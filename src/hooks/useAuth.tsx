import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SocialLogin } from '@capgo/capacitor-social-login';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_WEB_CLIENT_ID =
  '944708960468-an9no0hgjk5km71ccrednumqknliqhkq.apps.googleusercontent.com';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize native Google login (avoids browser/deeplink issues)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
      },
    }).catch((e) => console.warn('[Auth] SocialLogin.initialize failed:', e));
  }, []);

  // Handle deep-link callback for native OAuth (keeps auth flow inside the app)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    (async () => {
      listenerHandle = await App.addListener('appUrlOpen', async ({ url }) => {
        // Only handle our Supabase OAuth callback
        if (!url?.startsWith('com.plexkhmerzoon://auth/callback')) return;

        try {
          // Close the in-app browser (Chrome Custom Tabs / SFSafariViewController)
          await Browser.close();

          // For implicit flow, tokens are in the hash fragment (#access_token=...&refresh_token=...)
          // Convert hash to search params format for parsing
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              if (error) console.error('[Auth] setSession error:', error);
            }
          } else {
            // Fallback: try exchangeCodeForSession for PKCE flow (might fail if code_verifier is missing)
            const { error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) console.error('[Auth] exchangeCodeForSession error:', error);
          }
        } catch (error) {
          console.error('[Auth] appUrlOpen handler error:', error);
        }
      });
    })();

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    // Native Android/iOS: Use native Google Sign-In (no browser redirect)
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('[Auth] Starting native Google Sign-In...');
        
        const res = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });

        console.log('[Auth] SocialLogin response:', JSON.stringify(res));

        // Extract idToken from the response
        const idToken = (res as any)?.result?.idToken;
        
        if (!idToken) {
          console.error('[Auth] No idToken in response:', res);
          return { error: new Error('No ID token received from Google Sign-In') };
        }

        console.log('[Auth] Got idToken, signing into Supabase...');
        
        // Sign in to Supabase using the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          console.error('[Auth] Supabase signInWithIdToken error:', error);
          return { error };
        }

        console.log('[Auth] Successfully signed in:', data?.user?.email);
        return { error: null };
      } catch (error: any) {
        console.error('[Auth] Native Google Sign-In failed:', error);
        return { error: new Error(error?.message || 'Google Sign-In failed') };
      }
    }

    // Web
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

