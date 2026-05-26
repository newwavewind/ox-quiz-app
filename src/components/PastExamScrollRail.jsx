/** 화면 높이에 맞게 문항 번호를 샘플링하고, 건너뛴 구간은 · 로 표시 */
function buildRailItems(exams, currentIndex, maxNums = 18) {
  const n = exams.length
  if (n <= maxNums) {
    return exams.map((e, i) => ({ type: 'num', index: i, questionNo: e.question_no, examId: e.id }))
  }

  const indices = new Set([0, n - 1, currentIndex])
  if (currentIndex > 0) indices.add(currentIndex - 1)
  if (currentIndex < n - 1) indices.add(currentIndex + 1)

  const budget = Math.max(4, maxNums - indices.size)
  const step = Math.max(1, Math.ceil((n - 1) / budget))
  for (let i = 0; i < n; i += step) indices.add(i)

  const sorted = [...indices].sort((a, b) => a - b)
  const items = []
  for (let j = 0; j < sorted.length; j++) {
    const idx = sorted[j]
    if (j > 0 && sorted[j] - sorted[j - 1] > 1) items.push({ type: 'dot', key: `dot-${sorted[j - 1]}-${idx}` })
    const e = exams[idx]
    items.push({ type: 'num', index: idx, questionNo: e.question_no, examId: e.id, key: e.id })
  }
  return items
}

export default function PastExamScrollRail({
  exams,
  currentIndex,
  pastExamResults,
  pastExamDrafts,
  onJump,
  withRoundBar = false,
}) {
  if (exams.length < 2) return null

  const topClass = withRoundBar
    ? 'top-[calc(env(safe-area-inset-top,0px)+16rem)]'
    : 'top-[calc(env(safe-area-inset-top,0px)+10.5rem)]'

  const railItems = buildRailItems(exams, currentIndex)

  const chipClass = (idx, examId) => {
    const isCurrent = idx === currentIndex
    const result = pastExamResults?.[examId]
    const hasDraft = pastExamDrafts?.[examId]?.finalChoice != null
    let c =
      'min-w-[1.35rem] h-[1.15rem] rounded px-0.5 text-[9px] font-semibold leading-none tabular-nums transition-colors '
    if (isCurrent) {
      c += 'bg-indigo-600/90 text-white shadow-sm'
    } else if (result) {
      c += result.questionCorrect
        ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-100'
        : 'bg-rose-500/25 text-rose-900 dark:text-rose-100'
    } else if (hasDraft) {
      c += 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200'
    } else {
      c += 'text-slate-600/90 hover:bg-white/40 dark:text-slate-300 dark:hover:bg-white/10'
    }
    return c
  }

  return (
    <nav
      aria-label="문항 빠른 이동"
      className={`fixed right-0 z-30 flex flex-col items-center justify-center py-2 pr-0.5 pointer-events-none ${topClass} bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`}
    >
      <div className="pointer-events-auto overflow-hidden rounded-l-lg border border-r-0 border-white/30 bg-white/40 py-1.5 pl-0.5 pr-0.5 shadow-sm backdrop-blur-md dark:border-slate-500/30 dark:bg-slate-900/40">
        <ul className="flex flex-col items-center gap-0.5">
          {railItems.map(item => {
            if (item.type === 'dot') {
              return (
                <li key={item.key} aria-hidden className="text-[10px] leading-none text-slate-500/70 select-none">
                  ·
                </li>
              )
            }
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onJump(item.questionNo)}
                  aria-label={`${item.questionNo}번으로 이동`}
                  aria-current={item.index === currentIndex ? 'true' : undefined}
                  className={chipClass(item.index, item.examId)}
                >
                  {item.questionNo}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
