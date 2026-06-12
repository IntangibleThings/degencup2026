import { Routes, Route } from 'react-router-dom';
import { GameProvider } from '@/context/GameContext';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import TiersPage from '@/pages/TiersPage';
import DraftPage from '@/pages/DraftPage';
import StandingsPage from '@/pages/StandingsPage';
import ManagerPage from '@/pages/ManagerPage';
import RulesPage from '@/pages/RulesPage';
import AdminPage from '@/pages/AdminPage';
import PayoutPage from '@/pages/PayoutPage';
import TestPage from '@/pages/TestPage';
import DegenDenPage from '@/pages/DegenDenPage';

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen flex flex-col pixel-bg">
        <NavBar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tiers" element={<TiersPage />} />
            <Route path="/draft" element={<DraftPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/manager/:name" element={<ManagerPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/payout" element={<PayoutPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/degen-den" element={<DegenDenPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </GameProvider>
  );
}

export default App;
