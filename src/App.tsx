import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Negociador from './pages/Negociador';
import Gestao from './pages/Gestao';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-950">
        <nav className="border-b border-zinc-800 p-4 bg-ocl-primary/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="text-xl font-bold text-white tracking-tight">
              OCL <span className="font-light opacity-80">Agendamento</span>
            </span>
            <div className="flex gap-8">
              <Link to="/negociador" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">Negociador</Link>
              <Link to="/gestao" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">Gestão</Link>
            </div>
          </div>
        </nav>

        <main className="page-transition">
          <Routes>
            <Route path="/negociador" element={<Negociador />} />
            <Route path="/gestao" element={<Gestao />} />
            <Route path="/" element={<Navigate to="/negociador" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
