import { useMemo } from 'react'
import { getBrokerExamDdayInfo } from '../data/examDday'

/** 상단 AuthBar용 — ThemePickerMenu 버튼과 동일 높이 */
export default function ExamDdayChip() {
  const info = useMemo(() => getBrokerExamDdayInfo(), [])

  return (
    <div
      className="inline-flex h-[34px] items-center gap-1.5 shrink-0 px-2.5 rounded-lg border border-lime-300 dark:border-lime-600 bg-lime-50 dark:bg-lime-950/40"
      title={`${info.roundLabel} ${info.title} ${info.examDateLabel}`}
    >
      <span className="hidden sm:inline text-[10px] font-semibold text-lime-800/90 dark:text-lime-200/90 leading-none whitespace-nowrap">
        {info.roundLabel}
      </span>
      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none whitespace-nowrap">
        {info.ddayLabel}
      </span>
      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums leading-none whitespace-nowrap">
        {info.examDateLabel}
      </span>
    </div>
  )
}
