import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import Negociador from './pages/Negociador';
import PosAtendimento from './pages/PosAtendimento';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-brand-bg">
        <nav className="p-0 bg-ocl-primary sticky top-0 z-50 shadow-2xl shadow-ocl-primary/20">
          <div className="max-w-6xl mx-auto px-8 flex justify-between items-center h-20">
            <div className="flex items-center gap-4 h-full">
              <img src="/logo-white.png" alt="OCL" className="h-10 w-auto" />
              <span className="text-xl font-bold text-white tracking-tight">
                 <span className="font-light opacity-80 underline decoration-brand-accent decoration-2 underline-offset-4">Agendamento</span>
              </span>
            </div>
            
            <div className="flex gap-10 h-full">
              {[
                { path: '/negociador', label: 'Agendamento' },
                { path: '/pos-atendimento', label: 'Gestão' },
              ].map((link) => (
                <NavLink 
                  key={link.path}
                  to={link.path} 
                  className={({ isActive }) => `
                    relative flex items-center h-full text-sm font-semibold transition-all
                    ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-accent shadow-[0_-4px_12px_rgba(245,158,11,0.5)]"></div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <main className="page-transition">
          <Routes>
            <Route path="/negociador" element={<Negociador />} />
            <Route path="/pos-atendimento" element={<PosAtendimento />} />
            <Route path="/" element={<Navigate to="/negociador" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
