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
        <h1 className="font-pixel text-xl md:text-3xl mb-2" style={{ color: '#FFD700' }}>PRIZE PAYOUT</h1>
        <p className="font-pixel text-[10px] mb-8" style={{ color: '#AABBCC' }}>
          TOP 3 WINNERS SHARE THE POT · HKD {buyIn} BUY-IN
        </p>

        {/* Stats — Larger, Higher Contrast */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="retro-card p-5 text-center" style={{ borderColor: '#2D3192', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <Users className="w-6 h-6 mx-auto mb-2" style={{ color: '#4A5AFF' }} />
            <div className="font-pixel text-2xl" style={{ color: '#F0F0F0' }}>{numPlayers}</div>
            <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>PAID PLAYERS</div>
          </div>
          <div className="retro-card p-5 text-center" style={{ borderColor: '#FFD700', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <DollarSign className="w-6 h-6 mx-auto mb-2" style={{ color: '#FFD700' }} />
            <div className="font-pixel text-2xl" style={{ color: '#FFD700' }}>{buyIn}</div>
            <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>{currency} BUY-IN</div>
          </div>
          <div className="retro-card p-5 text-center" style={{ borderColor: '#00AA00', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: '#00DD00' }} />
            <div className="font-pixel text-2xl" style={{ color: '#00FF00' }}>{totalPot.toLocaleString()}</div>
            <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>TOTAL POT</div>
          </div>
          <div className="retro-card p-5 text-center" style={{ borderColor: '#E60012', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <Award className="w-6 h-6 mx-auto mb-2" style={{ color: '#FF4444' }} />
            <div className="font-pixel text-2xl" style={{ color: '#F0F0F0' }}>3</div>
            <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>WINNERS</div>
          </div>
        </div>

        {/* Prizes — Larger Cards, Higher Contrast */}
        <div className="space-y-6 mb-8">
          {/* 1st Place */}
          <div className="retro-card p-6 md:p-8" style={{ borderColor: '#FFD700', borderWidth: '4px', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="w-10 h-10 md:w-12 md:h-12" style={{ color: '#FFD700' }} />
              <div className="flex-1">
                <h2 className="font-pixel text-base md:text-lg" style={{ color: '#FFD700' }}>1ST PLACE</h2>
                <p className="font-pixel text-[9px]" style={{ color: '#AABBCC' }}>{pct1}% OF THE POT</p>
              </div>
              <div className="text-right">
                <div className="font-pixel text-2xl md:text-3xl" style={{ color: '#FFD700' }}>
                  {currency} {first.toLocaleString()}
                </div>
                <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct1}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-4" style={{ backgroundColor: '#1A1A2E', border: '1px solid #333' }}>
              <div className="h-full" style={{ width: `${pct1}%`, backgroundColor: '#FFD700' }} />
            </div>
          </div>

          {/* 2nd Place */}
          <div className="retro-card p-6 md:p-8" style={{ borderColor: '#C0C0C0', borderWidth: '3px', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <div className="flex items-center gap-4 mb-4">
              <Medal className="w-9 h-9 md:w-11 md:h-11" style={{ color: '#C0C0C0' }} />
              <div className="flex-1">
                <h2 className="font-pixel text-sm md:text-base" style={{ color: '#C0C0C0' }}>2ND PLACE</h2>
                <p className="font-pixel text-[9px]" style={{ color: '#AABBCC' }}>{pct2}% OF THE POT</p>
              </div>
              <div className="text-right">
                <div className="font-pixel text-xl md:text-2xl" style={{ color: '#C0C0C0' }}>
                  {currency} {second.toLocaleString()}
                </div>
                <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct2}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-4" style={{ backgroundColor: '#1A1A2E', border: '1px solid #333' }}>
              <div className="h-full" style={{ width: `${pct2}%`, backgroundColor: '#C0C0C0' }} />
            </div>
          </div>

          {/* 3rd Place */}
          <div className="retro-card p-6 md:p-8" style={{ borderColor: '#CD7F32', borderWidth: '3px', backgroundColor: 'rgba(8,12,20,0.98)' }}>
            <div className="flex items-center gap-4 mb-4">
              <Award className="w-9 h-9 md:w-11 md:h-11" style={{ color: '#CD7F32' }} />
              <div className="flex-1">
                <h2 className="font-pixel text-sm md:text-base" style={{ color: '#CD7F32' }}>3RD PLACE</h2>
                <p className="font-pixel text-[9px]" style={{ color: '#AABBCC' }}>{pct3}% OF THE POT</p>
              </div>
              <div className="text-right">
                <div className="font-pixel text-xl md:text-2xl" style={{ color: '#CD7F32' }}>
                  {currency} {third.toLocaleString()}
                </div>
                <div className="font-pixel text-[8px] mt-1" style={{ color: '#AABBCC' }}>
                  {numPlayers > 0 ? `${buyIn} x ${numPlayers} x ${pct3}%` : 'Waiting for players'}
                </div>
              </div>
            </div>
            <div className="w-full h-4" style={{ backgroundColor: '#1A1A2E', border: '1px solid #333' }}>
              <div className="h-full" style={{ width: `${pct3}%`, backgroundColor: '#CD7F32' }} />
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="retro-card p-5" style={{ backgroundColor: 'rgba(8,12,20,0.98)' }}>
          <h2 className="font-pixel text-[10px] mb-4" style={{ color: '#FFD700' }}>PAYOUT BREAKDOWN BY PLAYER COUNT</h2>
          <div style={{ border: '2px solid #0F3460' }}>
            <div className="grid grid-cols-4 gap-2 px-4 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(45,49,146,0.3)', color: '#AABBCC' }}>
              <div>PLAYERS</div>
              <div className="text-right" style={{ color: '#FFD700' }}>1ST</div>
              <div className="text-right" style={{ color: '#C0C0C0' }}>2ND</div>
              <div className="text-right" style={{ color: '#CD7F32' }}>3RD</div>
            </div>
            {[5, 6, 8, 10, 12, 15, 20].map(n => {
              const pot = n * buyIn;
              return (
                <div key={n} className="grid grid-cols-4 gap-2 px-4 py-2 font-pixel text-[9px]"
                  style={{ borderBottom: '1px solid #16213E', backgroundColor: n === numPlayers ? 'rgba(255,215,0,0.1)' : 'transparent' }}>
                  <div style={{ color: n === numPlayers ? '#FFD700' : '#E8E8E8' }}>
                    {n} {n === numPlayers && '&#9668; CURRENT'}
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
        <div className="retro-card p-5 mt-6" style={{ backgroundColor: 'rgba(8,12,20,0.98)' }}>
          <h2 className="font-pixel text-[10px] mb-4" style={{ color: '#FFD700' }}>PAYMENT STATUS</h2>
          {state.managers.length === 0 ? (
            <p className="font-pixel text-[8px]" style={{ color: '#AABBCC' }}>NO MANAGERS YET</p>
          ) : (
            <div className="space-y-2">
              {state.managers.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: '#1A1A2E' }}>
                  <span className="font-pixel text-[9px]" style={{ color: '#E8E8E8' }}>{m.name}</span>
                  <span className="font-pixel text-[8px] px-3 py-1"
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
