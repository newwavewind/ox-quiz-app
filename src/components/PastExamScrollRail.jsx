import { useEffect, useRef } from 'react'

export default function PastExamScrollRail({
  exams,
  currentIndex,
  pastExamResults,
  pastExamDrafts,
  onJump,
  withRoundBar = false,
}) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  if (exams.length < 2) return null

  const topClass = withRoundBar
    ? 'top-[calc(env(safe-area-inset-top,0px)+16rem)]'
    : 'top-[calc(env(safe-area-inset-top,0px)+10.5rem)]'

  return (
    <nav
      aria-label="문항 빠른 이동"
      className={`fixed right-0 z-30 flex flex-col items-stretch py-1 pr-0.5 pointer-events-none ${topClass} bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`}
    >
      <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-l-xl border border-r-0 border-slate-200/90 bg-white/90 py-1 pl-0.5 pr-0.5 shadow-md shadow-slate-900/5 backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-800/90">
        <ul className="flex flex-col items-center gap-px">
          {exams.map((e, idx) => {
            const isCurrent = idx === currentIndex
            const result = pastExamResults?.[e.id]
            const hasDraft = pastExamDrafts?.[e.id]?.finalChoice != null

            let chip =
              'min-w-[1.35rem] h-[1.15rem] rounded px-0.5 text-[9px] font-semibold leading-none tabular-nums transition-colors '
            if (isCurrent) {
              chip += 'bg-indigo-600 text-white shadow-sm'
            } else if (result) {
              chip += result.questionCorrect
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
            } else if (hasDraft) {
              chip += 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/80'
            } else {
              chip += 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
            }

            return (
              <li key={e.id}>
                <button
                  ref={isCurrent ? activeRef : undefined}
                  type="button"
                  onClick={() => onJump(e.question_no)}
                  aria-label={`${e.question_no}번으로 이동`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={chip}
                >
                  {e.question_no}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
