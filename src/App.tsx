import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Negociador from './pages/Negociador';
import Gestao from './pages/Gestao';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-950">
        <nav className="border-b border-zinc-800 p-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
              OCL Agendamento
            </span>
            <div className="flex gap-6">
              <Link to="/negociador" className="text-zinc-400 hover:text-white transition-colors">Negociador</Link>
              <Link to="/gestao" className="text-zinc-400 hover:text-white transition-colors">Gestão</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/negociador" element={<Negociador />} />
          <Route path="/gestao" element={<Gestao />} />
          <Route path="/" element={<Navigate to="/negociador" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
