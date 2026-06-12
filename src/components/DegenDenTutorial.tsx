import { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Clock, MessageCircle, Trophy, Beer } from 'lucide-react';

const STEPS = [
  {
    title: 'WELCOME TO THE DEGEN DEN',
    body: 'This is where managers send each other friendly challenges. Pick anything tournament-related — teams, players, outcomes. The stakes are beer mugs, not money. It is all in good fun.',
    icon: <Beer className="w-8 h-8" />,
  },
  {
    title: 'STEP 1: START A FRIENDLY CHALLENGE',
    body: 'Pick a friend, describe the friendly challenge, and set the beer mugs. Half a mug up to 5. Same mugs means both friends owe the same. Different mugs lets each friend owe a different amount.',
    icon: <Beer className="w-8 h-8" />,
  },
  {
    title: 'STEP 2: FRIEND ACCEPTS',
    body: 'Your friend sees the friendly challenge right away and has 24 hours to accept it with their pincode. If they do not accept in time, it expires and disappears. No hard feelings.',
    icon: <Clock className="w-8 h-8" />,
  },
  {
    title: 'STEP 3: SHAKE ON IT',
    body: 'Once accepted, the friendly challenge is LIVE and locked in. Both friends handle the beer exchange directly between themselves — no middleman, no app involved. Honor system.',
    icon: <Trophy className="w-8 h-8" />,
  },
  {
    title: 'WHAT THE STREETS ARE SAYING',
    body: 'Every friendly challenge has a comment section. Talk trash, make predictions, or explain why your friendly challenge is a lock. Comments are always open.',
    icon: <MessageCircle className="w-8 h-8" />,
  },
];

export default function DegenDenTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(10, 4, 24, 0.92)' }}>
      <div className="w-full max-w-md p-6 relative" style={{ background: 'rgba(30, 10, 64, 0.98)', border: '3px solid #7c43bd', boxShadow: '0 8px 32px rgba(120, 40, 200, 0.4)' }}>
        <button onClick={onClose} className="absolute top-3 right-3" style={{ color: '#6a5090' }}>
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1 mb-6 justify-center">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full" style={{
              width: i === step ? 24 : 8,
              backgroundColor: i === step ? '#c880ff' : i < step ? '#7c43bd' : '#4a2080',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <div className="text-center">
          <div className="mb-4" style={{ color: '#c880ff' }}>{STEPS[step].icon}</div>
          <h2 className="font-pixel text-sm mb-3" style={{ color: '#e8d5f5' }}>{STEPS[step].title}</h2>
          <p className="font-pixel text-[8px] leading-relaxed mb-6" style={{ color: '#a080cc' }}>{STEPS[step].body}</p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="font-pixel text-[8px] px-3 py-2 disabled:opacity-30"
            style={{ color: '#a080cc' }}
          >
            <ChevronLeft className="w-4 h-4 inline" /> BACK
          </button>

          <span className="font-pixel text-[7px]" style={{ color: '#6a5090' }}>
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="pixel-btn purple small">
              NEXT <ChevronRight className="w-4 h-4 inline" />
            </button>
          ) : (
            <button onClick={onClose} className="pixel-btn green small">
              GOT IT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
