import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/negociador';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalEmail = identifier;
      
      // Mapeamento inteligente para o seu acesso
      if (identifier.toLowerCase() === 'arthur') {
        finalEmail = 'arthurcamponez2020@gmail.com';
      } else if (!identifier.includes('@')) {
        finalEmail = `${identifier}@gmail.com`;
      }

      console.log('Tentando login para:', finalEmail);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (authError) {
        console.error('Erro de autenticação:', authError);
        throw authError;
      }

      if (!data.user) {
        throw new Error('Usuário não retornado após login.');
      }

      console.log('Login realizado com sucesso. ID:', data.user.id);

      // Fetch profile to decide navigation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.warn('Perfil não encontrado ou erro ao buscar:', profileError);
      }

      const role = profile?.role || 'negociador';
      console.log('Role detectada:', role);

      if (role === 'admin') {
        console.log('Navegando para Gestão...');
        navigate('/pos-atendimento');
      } else {
        console.log('Navegando para Negociador:', from);
        navigate(from);
      }
    } catch (err: any) {
      console.error('Catch handleLogin:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid login') || msg.includes('Invalid credentials')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(msg || 'Erro ao realizar login.');
      }
    } finally {
      console.log('Fim handleLogin - setLoading(false)');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]"
      >
        <div className="bg-white p-10 md:p-12 rounded-[2rem] shadow-2xl shadow-slate-200/50 space-y-10">
          <div className="flex justify-center">
            <img src="/logo.png" alt="OCL" className="h-12 w-auto" />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold uppercase"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-5">
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">USUÁRIO</label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base font-normal text-slate-900 outline-none focus:border-[#003366] transition-all placeholder:text-slate-400"
                    placeholder="Ex: arthur"
                  />
               </div>

              <div>
                 <label className="block text-xs font-bold uppercase text-slate-500 mb-1">SENHA</label>
                 <input
                   type="password"
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base font-normal text-slate-900 outline-none focus:border-[#003366] transition-all placeholder:text-slate-400"
                   placeholder="••••••••"
                 />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003366] text-white rounded-xl py-4 font-bold text-base transition-all hover:scale-[1.02] hover:bg-[#002244] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-6">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">© 2026 OCL Advogados Associados</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
