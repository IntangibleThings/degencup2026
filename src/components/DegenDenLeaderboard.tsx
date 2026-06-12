import { useMemo } from 'react';
import type { Wager } from '@/data/tournament';
import { MugDisplay } from '@/pages/DegenDenPage';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardEntry {
  managerId: string;
  managerName: string;
  handsMade: number;
  handsAccepted: number;
  wins: number;
  losses: number;
  pushes: number;
  mugProfit: number;
  pending: number;
  maxWinMugs: number;
  maxLossMugs: number;
}

export default function DegenDenLeaderboard({ wagers, managers }: { wagers: Wager[]; managers: { id: string; name: string }[] }) {
  const leaderboard = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    managers.forEach(m => {
      map.set(m.id, { managerId: m.id, managerName: m.name, handsMade: 0, handsAccepted: 0, wins: 0, losses: 0, pushes: 0, mugProfit: 0, pending: 0, maxWinMugs: 0, maxLossMugs: 0 });
    });

    wagers.forEach(w => {
      if (!map.has(w.proposerId)) map.set(w.proposerId, { managerId: w.proposerId, managerName: w.proposerName, handsMade: 0, handsAccepted: 0, wins: 0, losses: 0, pushes: 0, mugProfit: 0, pending: 0, maxWinMugs: 0, maxLossMugs: 0 });
      if (!map.has(w.acceptorId)) map.set(w.acceptorId, { managerId: w.acceptorId, managerName: w.acceptorName, handsMade: 0, handsAccepted: 0, wins: 0, losses: 0, pushes: 0, mugProfit: 0, pending: 0, maxWinMugs: 0, maxLossMugs: 0 });
      map.get(w.proposerId)!.handsMade++;
      map.get(w.acceptorId)!.handsAccepted++;

      if (w.status === 'resolved') {
        if (w.winnerId === null) { map.get(w.proposerId)!.pushes++; map.get(w.acceptorId)!.pushes++; }
        else if (w.winnerId === w.proposerId) { map.get(w.proposerId)!.wins++; map.get(w.proposerId)!.mugProfit += w.acceptorMugs; map.get(w.acceptorId)!.losses++; map.get(w.acceptorId)!.mugProfit -= w.acceptorMugs; }
        else { map.get(w.acceptorId)!.wins++; map.get(w.acceptorId)!.mugProfit += w.proposerMugs; map.get(w.proposerId)!.losses++; map.get(w.proposerId)!.mugProfit -= w.proposerMugs; }
      } else if (w.status === 'live') {
        map.get(w.proposerId)!.pending++;
        map.get(w.acceptorId)!.pending++;
        map.get(w.proposerId)!.maxWinMugs += w.acceptorMugs;
        map.get(w.proposerId)!.maxLossMugs += w.proposerMugs;
        map.get(w.acceptorId)!.maxWinMugs += w.proposerMugs;
        map.get(w.acceptorId)!.maxLossMugs += w.acceptorMugs;
      }
    });

    return Array.from(map.values())
      .filter(e => e.handsMade > 0 || e.handsAccepted > 0)
      .sort((a, b) => b.mugProfit - a.mugProfit);
  }, [wagers, managers]);

  if (leaderboard.length === 0) return null;

  return (
    <div>
      <h2 className="font-pixel text-sm mb-4 flex items-center gap-2" style={{ color: '#c880ff' }}>
        <Trophy className="w-5 h-5" /> FRIENDLY CHALLENGE BOARD
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #4a2080' }}>
              {['RANK', 'MANAGER', 'RIGHT', 'WRONG', 'SPLIT', 'PENDING', 'MAX BEERS IN', 'MAX BEERS OUT', 'MUG BALANCE'].map(h => (
                <th key={h} className="font-pixel text-[7px] py-2 px-1 text-left" style={{ color: '#6a5090' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((e, i) => (
              <tr key={e.managerId} style={{ borderBottom: '1px solid rgba(74, 32, 128, 0.3)' }}>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#6a5090' }}>{i + 1}</td>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: '#e8d5f5' }}>{e.managerName}</td>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: '#2a9d8f' }}>{e.wins}</td>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: '#e76f51' }}>{e.losses}</td>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: '#8899AA' }}>{e.pushes}</td>
                <td className="font-pixel text-[8px] py-2 px-1" style={{ color: '#c9a227' }}>{e.pending}</td>
                <td className="font-pixel text-[8px] py-2 px-1"><MugDisplay mugs={e.maxWinMugs} size={12} /></td>
                <td className="font-pixel text-[8px] py-2 px-1"><MugDisplay mugs={e.maxLossMugs} size={12} /></td>
                <td className="font-pixel text-[8px] py-2 px-1 flex items-center gap-1">
                  {e.mugProfit > 0 ? <TrendingUp className="w-3 h-3" style={{ color: '#00ff88' }} /> : e.mugProfit < 0 ? <TrendingDown className="w-3 h-3" style={{ color: '#e76f51' }} /> : <Minus className="w-3 h-3" style={{ color: '#6a5090' }} />}
                  <span style={{ color: e.mugProfit > 0 ? '#00ff88' : e.mugProfit < 0 ? '#e76f51' : '#6a5090' }}>{e.mugProfit > 0 ? '+' : ''}{e.mugProfit}M</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
