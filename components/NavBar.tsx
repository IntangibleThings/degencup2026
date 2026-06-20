import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Menu, X, Trophy, Flame } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/tiers', label: 'TIERS' },
  { path: '/draft', label: 'DRAFT' },
  { path: '/standings', label: 'STANDINGS' },
  { path: '/payout', label: 'PAYOUT' },
  { path: '/rules', label: 'RULES' },
  { path: '/degen-den', label: 'DEN', icon: true },
  { path: '/admin', label: 'ADMIN' },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { state } = useGame();

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
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path}
              className="font-pixel text-[9px] px-3 py-2 transition-colors flex items-center gap-1"
              style={{
                color: location.pathname === item.path
                  ? (item.icon ? '#d4a853' : '#FFD700')
                  : '#8899AA',
                borderBottom: location.pathname === item.path
                  ? (item.icon ? '4px solid #d4a853' : '4px solid #FFD700')
                  : '4px solid transparent',
              }}>
              {item.icon && <Flame className="w-3 h-3" />}
              {item.label}
            </Link>
          ))}
        </div>

        {state.currentUser && (
          <div className="hidden md:flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center font-pixel text-[8px]"
              style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
              {state.currentUser[0]}
            </div>
          </div>
        )}

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: '#E8E8E8' }}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6" style={{ backgroundColor: '#16213E' }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              className="font-pixel text-lg flex items-center gap-2" style={{ color: location.pathname === item.path ? (item.icon ? '#d4a853' : '#FFD700') : '#E8E8E8' }}>
              {item.icon && <Flame className="w-4 h-4" style={{ color: '#d4a853' }} />}
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
