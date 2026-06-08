import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_SCORING } from '@/data/tournament';

const FAQS = [
  { q: 'Can I pick the same teams as another manager?', a: 'Yes! This is open-pick mode. Multiple managers can select the same team. In draft mode (if enabled by the commissioner), each team can only be picked once.' },
  { q: 'Can I change my picks after submitting?', a: 'No. Once your roster is locked in, it cannot be changed. Make sure you are happy with your 12 teams before submitting.' },
  { q: 'When do submissions close?', a: 'Submissions close at kickoff of the first World Cup match on June 11, 2026 at 15:00 ET.' },
  { q: 'What is the late entry penalty?', a: 'You lose 2 points for every match day that has passed before you enter. Miss 3 days = -6 points off your total.' },
  { q: 'How does scoring work?', a: 'Teams earn points cumulatively for group placement and each knockout round they reach. A team that wins its group and the World Cup earns 46 points total.' },
  { q: 'When are standings updated?', a: 'Standings update after every match or at least after each matchday, depending on when results are entered.' },
];

export default function RulesPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sc = DEFAULT_SCORING;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-pixel text-lg md:text-2xl mb-2" style={{ color: '#FFD700' }}>RULES & SCORING</h1>
        <p className="font-pixel text-[8px] mb-6" style={{ color: '#8899AA' }}>HOW TO PLAY DEGEN WORLD CUP 2026</p>

        {/* Format Overview */}
        <div className="retro-card p-5 mb-6" style={{ borderColor: '#2D3192' }}>
          <h2 className="font-pixel text-xs mb-3" style={{ color: '#FFD700' }}>GAME FORMAT</h2>
          <div className="space-y-2 text-xs" style={{ color: '#E8E8E8' }}>
            <p>Each manager drafts a roster of <strong style={{ color: '#FFD700' }}>12 national teams</strong> before the World Cup begins.</p>
            <p>Your roster must include teams from three tiers:</p>
            <ul className="list-none space-y-1 mt-2">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3" style={{ backgroundColor: '#FFD700' }} />
                <strong style={{ color: '#FFD700' }}>2 Favorites</strong> — Genuine title contenders
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3" style={{ backgroundColor: '#2D3192' }} />
                <strong style={{ color: '#2D3192' }}>4 Mid-tier</strong> — Strong knockout-bound teams
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3" style={{ backgroundColor: '#8899AA' }} />
                <strong style={{ color: '#8899AA' }}>6 Underdogs</strong> — Upset potential
              </li>
            </ul>
            <p className="mt-3" style={{ color: '#8899AA' }}>Teams earn points based on how far they progress. Your total score is the sum of all 12 teams.</p>
          </div>
        </div>

        {/* Scoring System */}
        <div className="retro-card p-5 mb-6" style={{ borderColor: '#FFD700' }}>
          <h2 className="font-pixel text-xs mb-3" style={{ color: '#FFD700' }}>SCORING SYSTEM (CUMULATIVE)</h2>
          <div style={{ border: '2px solid #0F3460' }}>
            {[
              ['Finish 1st in group', `+${sc.groupFirst}`],
              ['Finish 2nd in group', `+${sc.groupSecond}`],
              ['Finish 3rd & qualify', `+${sc.groupThirdQualify}`],
              ['Finish 4th in group', `${sc.groupFourth}`],
              ['Reach Round of 16', `+${sc.roundOf16}`],
              ['Reach Quarter-Final', `+${sc.quarterFinal}`],
              ['Reach Semi-Final', `+${sc.semiFinal}`],
              ['Reach Final', `+${sc.reachFinal}`],
              ['Win World Cup', `+${sc.winWorldCup}`],
              ['Win 3rd place', `+${sc.winThirdPlace}`],
              ['Top Scorer Bonus', `+${sc.topScorerBonus}`],
            ].map(([label, pts], i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2 font-pixel text-[9px]"
                style={{ borderBottom: i < 9 ? '1px solid #16213E' : 'none' }}>
                <span style={{ color: '#E8E8E8' }}>{label}</span>
                <span style={{ color: pts.startsWith('-') ? '#E60012' : '#FFD700' }}>{pts} pts</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3" style={{ backgroundColor: 'rgba(0,170,0,0.1)', borderLeft: '4px solid #00AA00' }}>
            <p className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>
              EXAMPLE: Wins group (+6) → R16 (+3) → QF (+5) → SF (+7) → Final (+10) → Wins Cup (+15) = <strong>46 points</strong>
            </p>
          </div>
        </div>

        {/* Top Scorer Bonus */}
        <div className="retro-card p-5 mb-6" style={{ borderColor: '#FFD700' }}>
          <h2 className="font-pixel text-xs mb-3" style={{ color: '#FFD700' }}>&#9917; TOP SCORER BONUS (+{sc.topScorerBonus} PTS)</h2>
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#E8E8E8' }}>
            After submitting your 12-team roster, you can guess which player will win the <strong style={{ color: '#FFD700' }}>FIFA Golden Boot</strong> — awarded to the player who scores the <strong>most goals</strong> in the tournament.
          </p>
          <div className="space-y-2 text-[11px]" style={{ color: '#8899AA' }}>
            <p>• Correct guess = <strong style={{ color: '#00AA00' }}>+{sc.topScorerBonus} bonus points</strong> added to your total</p>
            <p>• Based on <strong>official FIFA Golden Boot rankings</strong> (goals → assists → minutes played)</p>
            <p>• You must provide both the <strong>player's name</strong> and their <strong>country</strong></p>
            <p>• One guess per manager — no changes after the tournament begins</p>
          </div>
        </div>

        {/* Rules */}
        <div className="retro-card p-5 mb-6" style={{ borderColor: '#E60012' }}>
          <h2 className="font-pixel text-xs mb-3" style={{ color: '#E60012' }}>GAME RULES</h2>
          <div className="space-y-3">
            {[
              ['SUBMISSION DEADLINE', 'All rosters must be submitted before June 11, 2026 at 15:00 ET. No exceptions.'],
              ['AMENDMENT WINDOW', 'You can edit/change your roster until 1 hour before kickoff (June 11, 2026 at 14:00 ET). After that, rosters are permanently locked.'],
              ['LATE ENTRY PENALTY', '-2 points per match day that has passed. Enter on day 3 = -6 points.'],
              ['NO TRANSFERS', 'Once locked, your roster is final for the entire tournament. No trades or swaps.'],
              ['SCORING UPDATES', 'Standings update after every match or matchday when results are entered.'],
              ['TIEBREAKERS', '1) Most teams alive 2) Most semifinalists 3) Most finalists 4) Champion on roster 5) Earliest submission'],
            ].map(([title, text], i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-pixel text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#FFD700' }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-pixel text-[9px] mb-0.5" style={{ color: '#E8E8E8' }}>{title}</h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#8899AA' }}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="retro-card p-0 overflow-hidden mb-6">
          <div className="p-4" style={{ borderBottom: '2px solid #16213E' }}>
            <h2 className="font-pixel text-xs" style={{ color: '#FFD700' }}>FAQ</h2>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '2px solid #16213E' : 'none' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="font-pixel text-[9px]" style={{ color: '#E8E8E8' }}>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#8899AA' }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#8899AA' }} />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3">
                  <p className="text-xs leading-relaxed" style={{ color: '#8899AA' }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/')} className="pixel-btn w-full">BACK TO HOME</button>
      </div>
    </div>
  );
}
