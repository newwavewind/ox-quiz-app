import { PAST_EXAM_ROUND_MAX } from '../data/pastExamRounds'

const ROUNDS = Array.from({ length: PAST_EXAM_ROUND_MAX }, (_, i) => i + 1)

function TrophyIcon({ uid, sizeClass }) {
  const g = `trophy-g-${uid}`
  const s = `trophy-s-${uid}`
  return (
    <span
      className={`inline-flex shrink-0 ${sizeClass} drop-shadow-[0_2px_4px_rgba(180,83,9,0.45)]`}
      aria-hidden
    >
      <svg viewBox="0 0 32 40" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={g} x1="16" y1="2" x2="16" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="28%" stopColor="#fcd34d" />
            <stop offset="62%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id={s} x1="10" y1="6" x2="22" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M6.5 13.5C4 13 3 9.5 5 7.5 6.5 6 8.5 7 9.5 10.5 9 13 8 14.5 9.5 14.5 12 14 13.5 12.5 13.5Z"
          fill={`url(#${g})`}
          stroke="#92400e"
          strokeWidth="0.45"
          strokeLinejoin="round"
        />
        <path
          d="M25.5 13.5C28 13 29 9.5 27 7.5 25.5 6 23.5 7 22.5 10.5 23 13 24 14.5 22.5 14.5 20 14 18.5 12.5 18.5Z"
          fill={`url(#${g})`}
          stroke="#92400e"
          strokeWidth="0.45"
          strokeLinejoin="round"
        />
        <path
          d="M9 11h14l-1.8 14.5c-.2 1.4-1.3 2.5-2.7 2.5h-5c-1.4 0-2.5-1.1-2.7-2.5L9 11z"
          fill={`url(#${g})`}
          stroke="#92400e"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <path d="M11.5 12.5h9l-.8 6.5a4 4 0 01-7.4 0l-.8-6.5z" fill={`url(#${s})`} />
        <path d="M14 26.5h4v3.5h-4z" fill={`url(#${g})`} stroke="#92400e" strokeWidth="0.5" />
        <path
          d="M8 31.5h16c1.1 0 2 .9 2 2v1.5c0 .8-.7 1.5-1.5 1.5H7.5c-.8 0-1.5-.7-1.5-1.5V33.5c0-1.1.9-2 2-2z"
          fill={`url(#${g})`}
          stroke="#92400e"
          strokeWidth="0.6"
        />
        <circle cx="16" cy="7.5" r="2.2" fill="#fef08a" stroke="#d97706" strokeWidth="0.5" />
        <path
          d="M16 5.8l.55 1.1 1.2.18-.87.85.2 1.2-1.08-.57-1.08.57.2-1.2-.87-.85 1.2-.18L16 5.8z"
          fill="#f59e0b"
        />
      </svg>
    </span>
  )
}

function trophySizeForCount(total) {
  if (total <= 1) return 'w-8 h-10'
  if (total === 2) return 'w-7 h-9'
  if (total === 3) return 'w-6 h-8'
  if (total === 4) return 'w-5 h-6.5'
  return 'w-4 h-5'
}

function RoundTrophies({ count }) {
  if (!count) return null
  const overlap = count >= 4
  return (
    <div
      className="relative flex justify-center items-end min-h-[2.75rem] mb-1 px-0.5"
      aria-label={`${count}회독 완료`}
      role="img"
    >
      <div
        className="absolute inset-x-1 top-1 bottom-2 rounded-full bg-gradient-to-b from-amber-300/25 via-amber-400/10 to-transparent blur-[2px] pointer-events-none"
        aria-hidden
      />
      <div
        className={`relative flex justify-center items-end ${overlap ? '-space-x-1.5' : 'gap-0.5'}`}
      >
        {Array.from({ length: count }, (_, i) => (
          <TrophyIcon
            key={i}
            uid={`${count}-${i}`}
            sizeClass={`${trophySizeForCount(count)} ${i === count - 1 ? 'z-10' : 'z-0'}`}
          />
        ))}
      </div>
    </div>
  )
}

function statusMeta(rec) {
  if (rec?.passed) {
    return {
      label: '합격',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25',
      card: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/30 dark:to-slate-800 dark:border-emerald-800/50',
    }
  }
  if (rec?.hasGwakjak) {
    return {
      label: '과락',
      badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/25',
      card: 'border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white dark:from-amber-950/30 dark:to-slate-800 dark:border-amber-800/50',
    }
  }
  return {
    label: '불합격',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/25',
    card: 'border-rose-200/80 bg-gradient-to-b from-rose-50/90 to-white dark:from-rose-950/30 dark:to-slate-800 dark:border-rose-800/50',
  }
}

export default function PastExamTenRoundBar({
  roundsData = {},
  activeRound = null,
  onStartRound,
  onViewResult,
  onRetryWrong,
  onRetryCorrect,
}) {
  return (
    <div className="shrink-0 bg-white/90 dark:bg-slate-800/95 border-b border-slate-100 dark:border-slate-700 px-4 py-3.5 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-600" />
          <p className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
            5회독
          </p>
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-600" />
        </div>

        <div className="grid grid-cols-5 gap-2 w-full pt-0.5">
          {ROUNDS.map(n => {
            const rec = roundsData[n]
            const isActive = activeRound === n
            const isDone = rec?.completed
            const status = isDone ? statusMeta(rec) : null
            const scoreText =
              rec?.score != null
                ? `${rec.score}점`
                : isDone
                  ? `${rec.questionCorrect}/${rec.questionTotal}`
                  : null

            if (isDone && !isActive) {
              return (
                <div key={n} className="flex flex-col items-center min-w-0">
                  <RoundTrophies count={n} />
                  <div
                    className={`w-full flex flex-col rounded-2xl border shadow-sm overflow-hidden ${status.card}`}
                  >
                  <div className="px-2 pt-2.5 pb-2 text-center">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{n}회독</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tabular-nums leading-none">
                      {scoreText}
                    </p>
                    <span
                      className={`inline-flex mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ring-1 ring-inset ${status.badge}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex border-t border-slate-200/60 dark:border-slate-600/60 divide-x divide-slate-200/60 dark:divide-slate-600/60">
                    <button
                      type="button"
                      onClick={() => onViewResult(n)}
                      className="flex-1 py-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors"
                    >
                      채점
                    </button>
                    {rec.questionCorrect > 0 && onRetryCorrect ? (
                      <button
                        type="button"
                        onClick={() => onRetryCorrect(n)}
                        className="flex-1 py-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        정답
                        <span className="block text-[9px] font-bold opacity-80">{rec.questionCorrect}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2 text-[10px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                    {rec.wrongCount > 0 && onRetryWrong ? (
                      <button
                        type="button"
                        onClick={() => onRetryWrong(n)}
                        className="flex-1 py-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        오답
                        <span className="block text-[9px] font-bold opacity-80">{rec.wrongCount}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2 text-[10px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                  </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={n} className="flex flex-col items-center min-w-0 w-full">
              <button
                type="button"
                onClick={() => onStartRound(n)}
                className={`w-full relative flex flex-col items-center justify-center min-h-[5.25rem] rounded-2xl border-2 px-1 py-2.5 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/15 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/40 hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                )}
                <span
                  className={`text-xs font-bold ${isActive ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {n}회독
                </span>
                {isActive ? (
                  <span className="mt-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                    진행 중
                  </span>
                ) : (
                  <span className="mt-1 text-[9px] font-medium text-slate-400 dark:text-slate-500">시작</span>
                )}
              </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
