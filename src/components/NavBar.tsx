import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { getVersion } from '@/data/version';
import { Menu, X, Trophy, Flame, Crosshair } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/tiers', label: 'TIERS', icon: null },
  { path: '/draft', label: 'DRAFT', icon: null },
  { path: '/standings', label: 'STANDINGS', icon: null },
  { path: '/teams', label: 'TEAMS', icon: null },
  { path: '/fixtures', label: 'FIXTURES', icon: null },
  { path: '/degen-den', label: 'DEN', icon: Flame },
  { path: '/training-ground', label: 'GROUND', icon: Crosshair },
  { path: '/rules', label: 'RULES', icon: null },
  { path: '/admin', label: 'ADMIN', icon: null },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { state } = useGame();

  const hasPendingApprovals = useMemo(() =>
    state.wagers.some(w => w.status === 'pending_acceptance'),
  [state.wagers]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 md:px-6"
        style={{ backgroundColor: '#1A1A2E', borderBottom: '1px solid #0F3460' }}>
        <Link to="/" className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <span className="font-pixel text-[10px] md:text-xs tracking-wider" style={{ color: '#FFD700' }}>
            DEGEN WORLD CUP
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isDen = item.path === '/degen-den';
            return (
              <Link key={item.path} to={item.path}
                className={`font-pixel text-[9px] px-3 py-2 transition-colors flex items-center gap-1 ${isDen && hasPendingApprovals ? 'nav-tab-fire' : ''}`}
                style={{
                  color: location.pathname === item.path
                    ? (isDen ? '#d4a853' : '#FFD700')
                    : '#8899AA',
                  borderBottom: location.pathname === item.path
                    ? (isDen ? '4px solid #d4a853' : '4px solid #FFD700')
                    : '4px solid transparent',
                }}>
                {Icon && <Icon className={`w-3 h-3 ${isDen && hasPendingApprovals ? 'flame-icon' : ''}`} />}
                {item.label}
                {isDen && hasPendingApprovals && (
                  <span className="ml-0.5 font-pixel text-[6px] px-1 rounded-full" style={{ backgroundColor: '#E60012', color: '#fff' }}>
                    {state.wagers.filter(w => w.status === 'pending_acceptance').length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="font-pixel text-[6px] px-1.5 py-0.5" style={{ color: '#6a5090', backgroundColor: 'rgba(106,80,144,0.15)' }}>
            {getVersion()}
          </span>
          {state.currentUser && (
            <div className="w-7 h-7 flex items-center justify-center font-pixel text-[8px]"
              style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
              {state.currentUser[0]}
            </div>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: '#E8E8E8' }}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6" style={{ backgroundColor: '#16213E' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isDen = item.path === '/degen-den';
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`font-pixel text-lg flex items-center gap-2 ${isDen && hasPendingApprovals ? 'nav-tab-fire' : ''}`}
                style={{ color: location.pathname === item.path ? (isDen ? '#d4a853' : '#FFD700') : '#E8E8E8' }}>
                {Icon && <Icon className={`w-4 h-4 ${isDen && hasPendingApprovals ? 'flame-icon' : ''}`} />}
                {item.label}
                {isDen && hasPendingApprovals && (
                  <span className="ml-1 font-pixel text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#E60012', color: '#fff' }}>
                    {state.wagers.filter(w => w.status === 'pending_acceptance').length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
