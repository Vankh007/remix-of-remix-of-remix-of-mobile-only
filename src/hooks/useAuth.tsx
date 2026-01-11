import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

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

          // Exchange the auth code for a Supabase session
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) console.error('[Auth] exchangeCodeForSession error:', error);
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
    // Native: open OAuth inside the app (Custom Tabs) instead of bouncing to the external browser app
    if (Capacitor.isNativePlatform()) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.plexkhmerzoon://auth/callback',
            skipBrowserRedirect: true,
          },
        });

        if (error) return { error };
        if (!data?.url) return { error: new Error('No OAuth URL returned') };

        await Browser.open({ url: data.url });
        return { error: null };
      } catch (error: any) {
        console.error('Native Google Sign-In error:', error);
        return { error };
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

