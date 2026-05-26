import { hapticTap } from '../utils/haptic'

export default function PastExamScrollArrows({ onGoTop, onGoBottom, canGoTop, canGoBottom }) {
  const btnBase =
    'pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full border border-slate-300/15 bg-white/[0.04] text-slate-400/40 shadow-none backdrop-blur-[1px] transition-opacity active:opacity-70 dark:border-slate-500/12 dark:bg-slate-900/[0.06] dark:text-slate-500/40'
  const btnDisabled = 'opacity-20 pointer-events-none'

  const handleTop = e => {
    e.preventDefault()
    e.stopPropagation()
    if (!canGoTop) return
    hapticTap('light')
    onGoTop?.()
  }

  const handleBottom = e => {
    e.preventDefault()
    e.stopPropagation()
    if (!canGoBottom) return
    hapticTap('light')
    onGoBottom?.()
  }

  return (
    <nav
      aria-label="맨 위·맨 아래"
      className="fixed left-0 right-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-40 pointer-events-none"
    >
      <div className="max-w-2xl mx-auto px-3 flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={handleTop}
          disabled={!canGoTop}
          aria-label="맨 위 문항"
          className={`${btnBase} touch-manipulation ${!canGoTop ? btnDisabled : 'hover:text-slate-500/55 active:text-slate-500/65'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleBottom}
          disabled={!canGoBottom}
          aria-label="맨 아래 문항"
          className={`${btnBase} touch-manipulation ${!canGoBottom ? btnDisabled : 'hover:text-slate-500/55 active:text-slate-500/65'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
