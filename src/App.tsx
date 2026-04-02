import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Negociador from './pages/Negociador';
import PosAtendimento from './pages/PosAtendimento';
import { LoginPage } from './pages/auth';
import PrivateRoute from './components/PrivateRoute';
import { LogOut, User as UserIcon, ShieldCheck, Calendar } from 'lucide-react';

function Navbar() {
  const { user, profile, signOut, isAdmin, loading } = useAuth();
  const location = useLocation();

  const authRoutes = ['/login', '/forgot-password', '/change-password'];
  const isAuthPage = authRoutes.includes(location.pathname);
  if (loading || isAuthPage) return null;

  return (
    <nav className="p-0 bg-ocl-primary sticky top-0 z-50 shadow-2xl shadow-ocl-primary/20">
      <div className="max-w-6xl mx-auto px-8 flex justify-between items-center h-20">
        <div className="flex items-center gap-6 h-full">
          <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2">
            <img src="/logo-white.png" alt="OCL" className="h-10 w-auto" />
            <span className="text-xl font-bold text-white tracking-tight">
               <span className="font-light opacity-80 underline decoration-brand-accent decoration-2 underline-offset-4">Agendamento</span>
            </span>
          </div>
          
          <div className="flex gap-8 h-full">
            <NavLink 
              to="/negociador" 
              className={({ isActive }) => `
                relative flex items-center gap-2 h-full text-[10px] font-black uppercase tracking-widest transition-all
                ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
              `}
            >
              {({ isActive }) => (
                <>
                  <Calendar className="w-4 h-4" />
                  Agendamento
                  {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-accent shadow-[0_-4px_12px_rgba(245,158,11,0.5)]"></div>}
                </>
              )}
            </NavLink>

            {isAdmin && (
              <NavLink 
                to="/pos-atendimento" 
                className={({ isActive }) => `
                  relative flex items-center gap-2 h-full text-[10px] font-black uppercase tracking-widest transition-all
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Gestão
                    {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-accent shadow-[0_-4px_12px_rgba(245,158,11,0.5)]"></div>}
                  </>
                )}
              </NavLink>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                   <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black leading-none text-white uppercase tracking-wider">{profile?.full_name}</span>
                  <span className="text-[8px] font-bold leading-none text-white/40 uppercase tracking-widest mt-1">
                    {profile?.role === 'admin' ? 'Administrador' : 'Negociador'}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => signOut()}
                className="p-3 text-white/40 hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all group"
                title="Sair do Sistema"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            <NavLink 
              to="/login"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10"
            >
              Login Gestão
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const authRoutes = ['/login'];
  const isAuthPage = authRoutes.includes(location.pathname);

  return (
    <div className={`min-h-screen ${isAuthPage ? 'bg-slate-50' : 'bg-brand-bg'}`}>
      <Navbar />
      <main className="page-transition">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/negociador" element={<Negociador />} />
          <Route 
            path="/pos-atendimento" 
            element={
              <PrivateRoute requiredRole="admin">
                <PosAtendimento />
              </PrivateRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/negociador" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
