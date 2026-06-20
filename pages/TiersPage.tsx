import { useGame } from '@/context/GameContext';
import { getAllTeams } from '@/data/tournament';
import type { Tier } from '@/data/tournament';
import { Crown, Star, CircleDot } from 'lucide-react';

const TIER_CONFIG = {
  favorite: { label: 'FAVORITES', icon: Crown, color: '#FFD700', bg: 'rgba(255,215,0,0.1)', desc: 'Genuine title contenders' },
  mid: { label: 'MID-TIER', icon: Star, color: '#2D3192', bg: 'rgba(45,49,146,0.2)', desc: 'Expected to reach knockouts' },
  underdog: { label: 'UNDERDOGS', icon: CircleDot, color: '#8899AA', bg: 'rgba(136,153,170,0.1)', desc: 'Qualification battlers & upset potential' },
};

export default function TiersPage() {
  const { state } = useGame();
  const teams = getAllTeams(state.settings.tiers);

  return (
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-pixel text-lg md:text-2xl mb-2" style={{ color: '#FFD700' }}>TEAM TIERS</h1>
        <p className="font-pixel text-[8px] mb-6" style={{ color: '#8899AA' }}>
          ALL 48 TEAMS GROUPED BY TIER · DRAFT 2 FAVORITES · 4 MID-TIER · 6 UNDERDOGS
        </p>

        {/* Tier Roster Requirements */}
        <div className="retro-card p-4 mb-6" style={{ borderColor: '#FFD700' }}>
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>ROSTER REQUIREMENTS</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['favorite', 'mid', 'underdog'] as Tier[]).map(tier => {
              const config = TIER_CONFIG[tier];
              const count = teams.filter(t => t.tier === tier).length;
              const draftCount = tier === 'favorite' ? 2 : tier === 'mid' ? 4 : 6;
              return (
                <div key={tier} className="flex flex-col items-center gap-2 p-3" style={{ backgroundColor: config.bg, border: `2px solid ${config.color}` }}>
                  <config.icon className="w-5 h-5" style={{ color: config.color }} />
                  <span className="font-pixel text-[10px]" style={{ color: config.color }}>{config.label}</span>
                  <span className="font-pixel text-lg" style={{ color: '#E8E8E8' }}>{count}</span>
                  <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>teams</span>
                  <span className="font-pixel text-[8px] mt-1 px-2 py-0.5" style={{ backgroundColor: config.color, color: '#1A1A2E' }}>
                    Draft: {draftCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teams by Tier */}
        {(['favorite', 'mid', 'underdog'] as Tier[]).map(tier => {
          const config = TIER_CONFIG[tier];
          const tierTeams = teams.filter(t => t.tier === tier);
          const Icon = config.icon;

          return (
            <div key={tier} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <h2 className="font-pixel text-xs" style={{ color: config.color }}>{config.label}</h2>
                <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>({tierTeams.length} teams)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tierTeams.map(team => (
                  <div key={team.code} className="retro-card p-2 flex items-center gap-2" style={{ borderColor: config.color, borderWidth: '2px' }}>
                    <span className="text-lg">{team.flag}</span>
                    <div>
                      <div className="font-pixel text-[8px]" style={{ color: '#E8E8E8' }}>{team.code}</div>
                      <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>GROUP {team.group}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
