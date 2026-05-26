import { useEffect, useMemo, useState } from 'react'
import { hapticTap } from '../utils/haptic'

function useIsMobileRail() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

/** 화면 높이에 맞게 문항 번호 샘플링 · 모바일은 더 촘촘히 */
function buildRailItems(exams, currentIndex, { dense = false } = {}) {
  const n = exams.length
  const maxNums = dense ? 40 : 22

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
    if (j > 0 && sorted[j] - sorted[j - 1] > 1) {
      items.push({ type: 'dot', key: `dot-${sorted[j - 1]}-${idx}` })
    }
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
  const isMobile = useIsMobileRail()

  if (exams.length < 2) return null

  const topClass = withRoundBar
    ? 'top-[calc(env(safe-area-inset-top,0px)+16rem)]'
    : 'top-[calc(env(safe-area-inset-top,0px)+10.5rem)]'

  const railItems = useMemo(
    () => buildRailItems(exams, currentIndex, { dense: isMobile }),
    [exams, currentIndex, isMobile]
  )

  const chipClass = (idx, examId) => {
    const isCurrent = idx === currentIndex
    const result = pastExamResults?.[examId]
    const hasDraft = pastExamDrafts?.[examId]?.finalChoice != null
    const size = isMobile
      ? 'min-w-[1.25rem] h-[1.05rem] text-[8px]'
      : 'min-w-[1.35rem] h-[1.15rem] text-[9px]'
    let c = `${size} rounded px-0.5 font-semibold leading-none tabular-nums transition-colors `
    if (isCurrent) {
      c += 'text-indigo-600 dark:text-indigo-300 font-extrabold scale-110 drop-shadow-sm'
    } else if (result) {
      c += result.questionCorrect
        ? 'text-emerald-600/70 dark:text-emerald-300/65'
        : 'text-rose-600/70 dark:text-rose-300/65'
    } else if (hasDraft) {
      c += 'text-indigo-600/60 dark:text-indigo-300/55'
    } else {
      c += 'text-slate-500/50 dark:text-slate-400/45 active:text-slate-700/70'
    }
    return c
  }

  const handleJump = questionNo => {
    hapticTap('select')
    onJump(questionNo)
  }

  return (
    <nav
      aria-label="문항 빠른 이동"
      className={`fixed right-0 z-30 flex flex-col items-center justify-center py-2 pr-1 pointer-events-none ${topClass} bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`}
    >
      <div className="pointer-events-auto overflow-hidden bg-transparent py-0.5 pl-0 pr-0.5">
        <ul className={`flex flex-col items-center ${isMobile ? 'gap-px' : 'gap-0.5'}`}>
          {railItems.map(item => {
            if (item.type === 'dot') {
              return (
                <li
                  key={item.key}
                  aria-hidden
                  className={`leading-none text-slate-400/40 select-none ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}
                >
                  ·
                </li>
              )
            }
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => handleJump(item.questionNo)}
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
