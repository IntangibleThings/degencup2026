import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { DEFAULT_SCORING, calculateTeamPoints, TEAM_NAMES, TEAM_FLAGS } from '@/data/tournament';
import type { TournamentResults } from '@/data/tournament';
import { ArrowLeft } from 'lucide-react';

// Pre-built test scenarios
const TEST_SCENARIOS = {
  champion: { code: 'BRA', name: 'Brazil', flag: '🇧🇷', groupPos: 1, r16: true, qf: true, sf: true, f: true, champ: true },
  finalist: { code: 'ARG', name: 'Argentina', flag: '🇦🇷', groupPos: 1, r16: true, qf: true, sf: true, f: true, champ: false },
  semifinalist: { code: 'FRA', name: 'France', flag: '🇫🇷', groupPos: 1, r16: true, qf: true, sf: true, f: false, champ: false },
  quarterfinalist: { code: 'GER', name: 'Germany', flag: '🇩🇪', groupPos: 2, r16: true, qf: true, sf: false, f: false, champ: false },
  roundof16: { code: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', groupPos: 1, r16: true, qf: false, sf: false, f: false, champ: false },
  groupThird: { code: 'ESP', name: 'Spain', flag: '🇪🇸', groupPos: 3, r16: true, qf: false, sf: false, f: false, champ: false },
  groupFourth: { code: 'USA', name: 'USA', flag: '🇺🇸', groupPos: 4, r16: false, qf: false, sf: false, f: false, champ: false },
};

function toResults(scenario: typeof TEST_SCENARIOS.champion): TournamentResults {
  return {
    [scenario.code]: {
      groupPosition: scenario.groupPos,
      reachedKnockout: scenario.r16 || scenario.groupPos <= 3,
      reachedRoundOf16: scenario.r16,
      reachedQuarterFinal: scenario.qf,
      reachedSemiFinal: scenario.sf,
      reachedFinal: scenario.f,
      wonWorldCup: scenario.champ,
      wonThirdPlace: false,
      eliminated: !scenario.champ && scenario.groupPos === 4,
    },
  };
}

export default function TestPage() {
  const navigate = useNavigate();
  const { updateResult } = useGame();
  const [customCode, setCustomCode] = useState('');
  const [customPos, setCustomPos] = useState(1);
  const [customR16, setCustomR16] = useState(false);
  const [customQF, setCustomQF] = useState(false);
  const [customSF, setCustomSF] = useState(false);
  const [customF, setCustomF] = useState(false);
  const [customChamp, setCustomChamp] = useState(false);
  const [testResults, setTestResults] = useState<{code: string; points: number; breakdown: string[]}[]>([]);
  const [apiTestResult, setApiTestResult] = useState('');
  const sc = DEFAULT_SCORING;

  const runScenario = (key: string) => {
    const s = TEST_SCENARIOS[key as keyof typeof TEST_SCENARIOS];
    if (!s) return;
    const results = toResults(s);
    updateResult(s.code, results[s.code]);
    const calc = calculateTeamPoints(s.code, results, sc);
    setTestResults(prev => [...prev.filter(t => t.code !== s.code), { code: s.code, points: calc.points, breakdown: calc.breakdown }]);
  };

  const runCustom = () => {
    if (!customCode) return;
    const results: TournamentResults = {
      [customCode]: {
        groupPosition: customPos,
        reachedKnockout: customR16 || customPos <= 3,
        reachedRoundOf16: customR16,
        reachedQuarterFinal: customQF,
        reachedSemiFinal: customSF,
        reachedFinal: customF,
        wonWorldCup: customChamp,
        wonThirdPlace: false,
        eliminated: !customChamp && customPos === 4,
      },
    };
    updateResult(customCode, results[customCode]);
    const calc = calculateTeamPoints(customCode, results, sc);
    setTestResults(prev => [...prev.filter(t => t.code !== customCode), { code: customCode, points: calc.points, breakdown: calc.breakdown }]);
  };

  const testApi = async () => {
    setApiTestResult('Testing API...');
    try {
      const { loadApiConfig, syncResults } = await import('@/data/apiSync');
      const config = loadApiConfig();
      const result = await syncResults(config);
      if (result.errors.length > 0) {
        setApiTestResult('API ERROR: ' + result.errors.join(', '));
      } else if (result.updated > 0) {
        setApiTestResult('API OK! Updated ' + result.updated + ' teams. Calls used: ~1-2');
      } else {
        setApiTestResult('API OK! No finished matches found yet (tournament has not started). Calls used: ~1');
      }
    } catch (err) {
      setApiTestResult('API ERROR: ' + (err as Error).message);
    }
  };

  const clearAll = () => {
    setTestResults([]);
    setApiTestResult('');
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 mb-4 font-pixel text-[8px]" style={{ color: '#AABBCC' }}>
          <ArrowLeft className="w-3 h-3" /> BACK TO ADMIN
        </button>

        <h1 className="font-pixel text-lg mb-2" style={{ color: '#FFD700' }}>&#127942; SCORING TEST CENTER</h1>
        <p className="font-pixel text-[8px] mb-6" style={{ color: '#AABBCC' }}>VERIFY THAT SCORING AND API WORK CORRECTLY</p>

        {/* SCORING REFERENCE */}
        <div className="retro-card p-4 mb-6">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>SCORING REFERENCE</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono-game">
            {[
              ['1st in group', `+${sc.groupFirst}`], ['2nd in group', `+${sc.groupSecond}`], ['3rd & qualify', `+${sc.groupThirdQualify}`],
              ['4th in group', `${sc.groupFourth}`], ['Reach R16', `+${sc.roundOf16}`], ['Reach QF', `+${sc.quarterFinal}`],
              ['Reach SF', `+${sc.semiFinal}`], ['Reach Final', `+${sc.reachFinal}`], ['Win World Cup', `+${sc.winWorldCup}`],
              ['Win 3rd place', `+${sc.winThirdPlace}`], ['Top Scorer Bonus', `+${sc.topScorerBonus}`],
            ].map(([label, pts], i) => (
              <div key={i} className="flex justify-between px-2 py-1" style={{ backgroundColor: 'rgba(10,15,25,0.8)' }}>
                <span style={{ color: '#E8E8E8' }}>{label}</span>
                <span style={{ color: pts.startsWith('-') ? '#E60012' : '#FFD700' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRE-BUILT TEST SCENARIOS */}
        <div className="retro-card p-4 mb-6">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>PRE-BUILT TEST SCENARIOS</h2>
          <p className="font-pixel text-[7px] mb-3" style={{ color: '#AABBCC' }}>
            Click a scenario to simulate tournament results and see the scoring breakdown.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(TEST_SCENARIOS).map(([key, s]) => {
              const calc = calculateTeamPoints(s.code, toResults(s), sc);
              return (
                <button key={key} onClick={() => runScenario(key)}
                  className="retro-card p-3 text-left hover:opacity-80 transition-opacity"
                  style={{ borderColor: '#2D3192' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.flag}</span>
                    <span className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>{s.name}</span>
                  </div>
                  <p className="font-pixel text-[7px]" style={{ color: '#AABBCC' }}>
                    Group {s.groupPos}{s.champ ? ' | WORLD CHAMP' : s.f ? ' | FINALIST' : s.sf ? ' | SEMIFINALIST' : s.qf ? ' | QUARTERFINALIST' : s.r16 ? ' | ROUND OF 16' : ''}
                  </p>
                  <p className="font-pixel text-lg mt-1" style={{ color: '#FFD700' }}>
                    = {calc.points} PTS
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM TEST */}
        <div className="retro-card p-4 mb-6">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>CUSTOM SCORING TEST</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <select value={customCode} onChange={e => setCustomCode(e.target.value)} className="pixel-input text-[10px] py-2">
              <option value="">SELECT TEAM</option>
              {Object.entries(TEAM_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                <option key={code} value={code}>{TEAM_FLAGS[code]} {name}</option>
              ))}
            </select>
            <select value={customPos} onChange={e => setCustomPos(Number(e.target.value))} className="pixel-input text-[10px] py-2">
              <option value={1}>1st in group</option>
              <option value={2}>2nd in group</option>
              <option value={3}>3rd in group</option>
              <option value={4}>4th in group</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: 'R16', value: customR16, set: setCustomR16 },
              { label: 'QF', value: customQF, set: setCustomQF },
              { label: 'SF', value: customSF, set: setCustomSF },
              { label: 'Final', value: customF, set: setCustomF },
              { label: 'Champion', value: customChamp, set: setCustomChamp },
            ].map(({ label, value, set }) => (
              <button key={label} onClick={() => set(!value)}
                className="px-2 py-1 font-pixel text-[7px]"
                style={{ backgroundColor: value ? '#00AA00' : '#16213E', color: value ? '#FFF' : '#AABBCC', border: '2px solid ' + (value ? '#00AA00' : '#2D3192') }}>
                {value ? '&#10003;' : ''} {label}
              </button>
            ))}
          </div>
          <button onClick={runCustom} disabled={!customCode} className="pixel-btn gold small">
            CALCULATE SCORE
          </button>
        </div>

        {/* RESULTS */}
        {testResults.length > 0 && (
          <div className="retro-card p-4 mb-6" style={{ borderColor: '#00AA00' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-pixel text-[10px]" style={{ color: '#00AA00' }}>TEST RESULTS</h2>
              <button onClick={clearAll} className="font-pixel text-[7px]" style={{ color: '#E60012' }}>CLEAR ALL</button>
            </div>
            <div className="space-y-3">
              {testResults.map((r) => (
                <div key={r.code} className="p-3" style={{ backgroundColor: 'rgba(10,15,25,0.8)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{TEAM_FLAGS[r.code]}</span>
                    <span className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>{TEAM_NAMES[r.code] || r.code}</span>
                    <span className="font-pixel text-sm ml-auto" style={{ color: '#FFD700' }}>{r.points} PTS</span>
                  </div>
                  <div className="space-y-0.5">
                    {r.breakdown.map((b, i) => (
                      <div key={i} className="font-pixel text-[7px] pl-3" style={{ color: b.includes('-') ? '#E60012' : '#00AA00' }}>
                        {b}
                      </div>
                    ))}
                    {r.breakdown.length === 0 && (
                      <div className="font-pixel text-[7px]" style={{ color: '#AABBCC' }}>No points (group stage only)</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '2px solid #2D3192' }}>
              <div className="flex justify-between">
                <span className="font-pixel text-[10px]" style={{ color: '#FFD700' }}>TOTAL POINTS</span>
                <span className="font-pixel text-lg" style={{ color: '#FFD700' }}>{testResults.reduce((s, r) => s + r.points, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* API TEST */}
        <div className="retro-card p-4 mb-6" style={{ borderColor: '#2D3192' }}>
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>&#9917; API-FOOTBALL TEST</h2>
          <p className="font-pixel text-[7px] mb-3" style={{ color: '#AABBCC' }}>
            Test the API connection with your configured key. Uses ~1 API call.
          </p>
          <div className="flex gap-2 items-center">
            <button onClick={testApi} className="pixel-btn gold small">
              &#8635; TEST API NOW
            </button>
            {apiTestResult && (
              <span className="font-pixel text-[8px]" style={{ color: apiTestResult.includes('ERROR') ? '#E60012' : '#00AA00' }}>
                {apiTestResult}
              </span>
            )}
          </div>
        </div>

        {/* SCORING VERIFICATION TABLE */}
        <div className="retro-card p-4">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>EXPECTED POINTS TABLE</h2>
          <p className="font-pixel text-[7px] mb-3" style={{ color: '#AABBCC' }}>
            This table shows what points a team earns at each stage. Use it to verify calculations.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ backgroundColor: '#2D3192' }}>
                  <th className="font-pixel text-[7px] p-2 text-left" style={{ color: '#FFD700' }}>SCENARIO</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>GROUP</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>R16</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>QF</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>SF</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>FINAL</th>
                  <th className="font-pixel text-[7px] p-2 text-center" style={{ color: '#FFD700' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Group 1st, out at R16', g: 1, pts: sc.groupFirst + sc.roundOf16 },
                  { name: 'Group 2nd, out at R16', g: 2, pts: sc.groupSecond + sc.roundOf16 },
                  { name: 'Group 1st, out at QF', g: 1, pts: sc.groupFirst + sc.roundOf16 + sc.quarterFinal },
                  { name: 'Group 1st, reaches SF', g: 1, pts: sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal },
                  { name: 'Group 1st, Finalist', g: 1, pts: sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal + sc.reachFinal },
                  { name: 'Group 1st, CHAMPION', g: 1, pts: sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal + sc.reachFinal + sc.winWorldCup },
                  { name: 'Group 3rd, qualifies, out R16', g: 3, pts: sc.groupThirdQualify + sc.roundOf16 },
                  { name: 'Group 4th', g: 4, pts: sc.groupFourth },
                ].map((row, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(10,15,25,0.8)' : 'rgba(22,33,62,0.8)' }}>
                    <td className="p-2 font-pixel text-[7px]" style={{ color: '#E8E8E8' }}>{row.name}</td>
                    <td className="p-2 text-center" style={{ color: '#FFD700' }}>{row.g}{row.g === 1 ? 'st' : row.g === 2 ? 'nd' : row.g === 3 ? 'rd' : 'th'} (+{row.g === 1 ? sc.groupFirst : row.g === 2 ? sc.groupSecond : row.g === 3 ? sc.groupThirdQualify : sc.groupFourth})</td>
                    <td className="p-2 text-center" style={{ color: row.pts >= sc.groupFirst + sc.roundOf16 ? '#00AA00' : '#AABBCC' }}>{row.pts >= sc.groupFirst + sc.roundOf16 ? `+${sc.roundOf16}` : '-'}</td>
                    <td className="p-2 text-center" style={{ color: row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal ? '#00AA00' : '#AABBCC' }}>{row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal ? `+${sc.quarterFinal}` : '-'}</td>
                    <td className="p-2 text-center" style={{ color: row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal ? '#00AA00' : '#AABBCC' }}>{row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal ? `+${sc.semiFinal}` : '-'}</td>
                    <td className="p-2 text-center" style={{ color: row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal + sc.reachFinal ? '#00AA00' : '#AABBCC' }}>{row.pts >= sc.groupFirst + sc.roundOf16 + sc.quarterFinal + sc.semiFinal + sc.reachFinal ? `+${sc.reachFinal}` : '-'}</td>
                    <td className="p-2 text-center font-pixel text-[10px]" style={{ color: '#FFD700' }}>{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
