import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { authFetch } from '../services/apiClient';

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'operador' | 'negociador';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isNegociador: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile();
      }
      setLoading(false);
    };

    getInitialSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id);
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile in parallel or at least don't block the main loading state
        fetchProfile();
      } else {
        setProfile(null);
      }
      
      // Crucial: Clear loading state immediately once we have the session
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/admin/me`);
      if (!response.ok) {
        throw new Error('Falha ao buscar perfil local');
      }
      const data = await response.json();
      setProfile(data as Profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'operador';
  const isNegociador = !isAdmin;

  // Perfil padrão para acesso sem login (Negociador Padrão)
  const effectiveProfile = profile || (!user && window.location.pathname.startsWith('/negociador') ? {
    id: 'c3ffebad-8866-4f9d-9ffb-6d0ce76159f1',
    full_name: 'Negociador Padrão',
    role: 'negociador' as const,
    created_at: new Date().toISOString()
  } : null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile: effectiveProfile, 
      loading, 
      signOut, 
      isAdmin, 
      isNegociador 
    }}>
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
