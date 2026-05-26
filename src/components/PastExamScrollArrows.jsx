import { hapticTap } from '../utils/haptic'

export default function PastExamScrollArrows({
  onGoTop,
  onGoBottom,
  canGoTop,
  canGoBottom,
  rangeLabel,
  withRoundBar = false,
}) {
  const topClass = withRoundBar
    ? 'top-[calc(env(safe-area-inset-top,0px)+16rem)]'
    : 'top-[calc(env(safe-area-inset-top,0px)+10.5rem)]'

  const btnBase =
    'pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/60 bg-white/50 text-slate-700 shadow-sm backdrop-blur-sm transition-all active:scale-95 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-slate-200'
  const btnDisabled = 'opacity-30 pointer-events-none'

  const handleTop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canGoTop) return
    hapticTap('medium')
    onGoTop?.()
  }

  const handleBottom = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canGoBottom) return
    hapticTap('medium')
    onGoBottom?.()
  }

  return (
    <nav
      aria-label="맨 위·맨 아래 문항"
      className={`fixed right-2 z-40 flex flex-col items-center justify-center gap-2 pointer-events-none ${topClass} bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`}
    >
      <button
        type="button"
        onClick={handleTop}
        disabled={!canGoTop}
        aria-label="맨 위 문항"
        className={`${btnBase} ${!canGoTop ? btnDisabled : 'hover:bg-white/80 active:bg-white/90'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      {rangeLabel != null && (
        <span className="pointer-events-none text-[9px] font-semibold tabular-nums text-slate-500/80 dark:text-slate-400/80 text-center leading-tight">
          {rangeLabel}
        </span>
      )}
      <button
        type="button"
        onClick={handleBottom}
        disabled={!canGoBottom}
        aria-label="맨 아래 문항"
        className={`${btnBase} ${!canGoBottom ? btnDisabled : 'hover:bg-white/80 active:bg-white/90'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </nav>
  )
}
