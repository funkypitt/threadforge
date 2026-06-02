import { TWEET_MAX_CHARS } from '@/lib/utils'

interface CharacterCounterProps {
  count: number
}

export function CharacterCounter({ count }: CharacterCounterProps): JSX.Element {
  const remaining = TWEET_MAX_CHARS - count
  const ratio = count / TWEET_MAX_CHARS
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(ratio, 1))

  let strokeColor = '#3b82f6'
  if (ratio > 0.93) strokeColor = '#ef4444'
  else if (ratio > 0.85) strokeColor = '#eab308'

  return (
    <div className="flex items-center gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" className="rotate-[-90deg]">
        <circle cx="12" cy="12" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="2" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {remaining <= 20 && (
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: remaining < 0 ? '#ef4444' : remaining <= 10 ? '#eab308' : '#a3a3a3' }}
        >
          {remaining}
        </span>
      )}
    </div>
  )
}
