import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConnectGate } from './components/ConnectGate';
import { JobBoard } from './pages/JobBoard';
import { JobDetail } from './pages/JobDetail';
import { PostJob } from './pages/PostJob';

export default function App() {
  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Job Marketplace</h1>
          <p className="subtitle">Fernandez · Minelli · Wollheim</p>
        </div>
        <ConnectButton />
      </header>

      <ConnectGate>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Tablero
          </NavLink>
          <NavLink to="/publicar" className={({ isActive }) => (isActive ? 'active' : '')}>
            Publicar trabajo
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<JobBoard />} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/publicar" element={<PostJob />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConnectGate>
    </main>
  );
}
