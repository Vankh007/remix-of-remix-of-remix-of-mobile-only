import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
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

// Initialize social login for native platforms
const initializeSocialLogin = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SocialLogin.initialize({
        google: {
          webClientId: '956107790298-nvsmcmq5r8hb2j0ghbh5opji2olpk3ps.apps.googleusercontent.com',
        },
      });
    } catch (error) {
      console.error('Error initializing social login:', error);
    }
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize social login for native platforms
    initializeSocialLogin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    // Use native Google Sign-In for Android/iOS apps
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });

        if (result?.provider === 'google' && result.result) {
          const { idToken, accessToken } = result.result as { idToken?: string; accessToken?: string };
          
          if (idToken) {
            // Sign in to Supabase with the Google ID token
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
              access_token: accessToken,
            });
            
            return { error };
          } else {
            return { error: new Error('No ID token received from Google') };
          }
        }
        
        return { error: new Error('Google sign-in was cancelled') };
      } catch (error: any) {
        console.error('Native Google Sign-In error:', error);
        return { error };
      }
    }

    // Use Supabase OAuth for web platform
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
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
