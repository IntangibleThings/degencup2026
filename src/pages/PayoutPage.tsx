import { useGame } from '@/context/GameContext';
import { Trophy, Medal, Award, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function PayoutPage() {
  const { state, getPayouts } = useGame();
  const { totalPot, first, second, third, currency } = getPayouts();
  const numPlayers = state.managers.filter(m => m.paid).length;
  const buyIn = state.settings.payout.buyIn;
  const pct1 = state.settings.payout.firstPlacePercent;
  const pct2 = state.settings.payout.secondPlacePercent;
  const pct3 = state.settings.payout.thirdPlacePercent;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-pixel text-lg md:text-2xl mb-2" style={{ color: '#FFD700' }}>PRIZE PAYOUT</h1>
        <p className="font-pixel text-[8px] mb-6" style={{ color: '#8899AA' }}>
          TOP 3 WINNERS SHARE THE POT · HKD 250 BUY-IN
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="retro-card p-3 text-center" style={{ borderColor: '#2D3192' }}>
            <Users className="w-4 h-4 mx-auto mb-1" style={{ color: '#2D3192' }} />
            <div className="font-pixel text-lg" style={{ color: '#E8E8E8' }}>{numPlayers}</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>PAID PLAYERS</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#FFD700' }}>
            <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: '#FFD700' }} />
            <div className="font-pixel text-lg" style={{ color: '#FFD700' }}>{buyIn}</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>{currency} BUY-IN</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#00AA00' }}>
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#00AA00' }} />
            <div className="font-pixel text-lg" style={{ color: '#00AA00' }}>{totalPot.toLocaleString()}</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>TOTAL POT</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#E60012' }}>
            <Award className="w-4 h-4 mx-auto mb-1" style={{ color: '#E60012' }} />
            <div className="font-pixel text-lg" style={{ color: '#E60012' }}>3</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>WINNERS</div>
          </div>
        </div>

        {/* Prizes */}
        <div className="space-y-4 mb-6">
          {/* 1st Place */}
          <div className="retro-card p-5" style={{ borderColor: '#FFD700', borderWidth: '4px' }}>
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-8 h-8" style={{ color: '#FFD700' }} />
              <div>
                <h2 className="font-pixel text-sm" style={{ color: '#FFD700' }}>1ST PLACE</h2>
                <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>{pct1}% OF THE POT</p>
              </div>
              <div className="ml-auto text-right">
                <div className="font-pixel text-xl" style={{ color: '#FFD700' }}>
                  {currency} {first.toLocaleString()}
                </div>
                <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct1}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-3" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="h-full" style={{ width: `${pct1}%`, backgroundColor: '#FFD700' }} />
            </div>
          </div>

          {/* 2nd Place */}
          <div className="retro-card p-5" style={{ borderColor: '#C0C0C0', borderWidth: '3px' }}>
            <div className="flex items-center gap-3 mb-3">
              <Medal className="w-7 h-7" style={{ color: '#C0C0C0' }} />
              <div>
                <h2 className="font-pixel text-xs" style={{ color: '#C0C0C0' }}>2ND PLACE</h2>
                <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>{pct2}% OF THE POT</p>
              </div>
              <div className="ml-auto text-right">
                <div className="font-pixel text-lg" style={{ color: '#C0C0C0' }}>
                  {currency} {second.toLocaleString()}
                </div>
                <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct2}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-3" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="h-full" style={{ width: `${pct2}%`, backgroundColor: '#C0C0C0' }} />
            </div>
          </div>

          {/* 3rd Place */}
          <div className="retro-card p-5" style={{ borderColor: '#CD7F32', borderWidth: '3px' }}>
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-7 h-7" style={{ color: '#CD7F32' }} />
              <div>
                <h2 className="font-pixel text-xs" style={{ color: '#CD7F32' }}>3RD PLACE</h2>
                <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>{pct3}% OF THE POT</p>
              </div>
              <div className="ml-auto text-right">
                <div className="font-pixel text-lg" style={{ color: '#CD7F32' }}>
                  {currency} {third.toLocaleString()}
                </div>
                <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct3}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-3" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="h-full" style={{ width: `${pct3}%`, backgroundColor: '#CD7F32' }} />
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="retro-card p-4">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>PAYOUT BREAKDOWN BY PLAYER COUNT</h2>
          <div style={{ border: '2px solid #0F3460' }}>
            <div className="grid grid-cols-4 gap-2 px-3 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(45,49,146,0.3)', color: '#8899AA' }}>
              <div>PLAYERS</div>
              <div className="text-right" style={{ color: '#FFD700' }}>1ST</div>
              <div className="text-right" style={{ color: '#C0C0C0' }}>2ND</div>
              <div className="text-right" style={{ color: '#CD7F32' }}>3RD</div>
            </div>
            {[5, 6, 8, 10, 12, 15, 20].map(n => {
              const pot = n * buyIn;
              return (
                <div key={n} className="grid grid-cols-4 gap-2 px-3 py-1.5 font-pixel text-[8px]"
                  style={{ borderBottom: '1px solid #16213E', backgroundColor: n === numPlayers ? 'rgba(255,215,0,0.1)' : 'transparent' }}>
                  <div style={{ color: n === numPlayers ? '#FFD700' : '#E8E8E8' }}>
                    {n} {n === numPlayers && '◄ CURRENT'}
                  </div>
                  <div className="text-right" style={{ color: '#FFD700' }}>{currency} {Math.round(pot * pct1 / 100).toLocaleString()}</div>
                  <div className="text-right" style={{ color: '#C0C0C0' }}>{currency} {Math.round(pot * pct2 / 100).toLocaleString()}</div>
                  <div className="text-right" style={{ color: '#CD7F32' }}>{currency} {Math.round(pot * pct3 / 100).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Status */}
        <div className="retro-card p-4 mt-6">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>PAYMENT STATUS</h2>
          {state.managers.length === 0 ? (
            <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>NO MANAGERS YET</p>
          ) : (
            <div className="space-y-1">
              {state.managers.map(m => (
                <div key={m.id} className="flex items-center justify-between px-2 py-1" style={{ backgroundColor: '#1A1A2E' }}>
                  <span className="font-pixel text-[8px]" style={{ color: '#E8E8E8' }}>{m.name}</span>
                  <span className="font-pixel text-[8px] px-2 py-0.5"
                    style={{ backgroundColor: m.paid ? '#00AA00' : '#E60012', color: '#F0F0F0' }}>
                    {m.paid ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
