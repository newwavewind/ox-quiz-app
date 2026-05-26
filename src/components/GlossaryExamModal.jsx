import { useEffect } from 'react'
import { formatExamRef } from '../data/glossaryIndex'
import PastExamQuestionBlock from './PastExamQuestionBlock'

export default function GlossaryExamModal({
  exam,
  highlightTerm,
  onClose,
  savedNotes = {},
  onToggleNote,
}) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!exam) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      aria-modal="true"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[min(90dvh,calc(100vh-2rem))] flex flex-col rounded-2xl bg-slate-50 shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-labelledby="glossary-exam-title"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
          <div className="min-w-0">
            <h2 id="glossary-exam-title" className="text-sm font-bold text-indigo-700 truncate">
              {formatExamRef(exam)}
            </h2>
            {highlightTerm && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">용어 「{highlightTerm}」</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
          <PastExamQuestionBlock
            exam={exam}
            finalChoice={null}
            revealed={false}
            result={null}
            highlightTerm={highlightTerm}
            showAnswersAlways
            savedNotes={savedNotes}
            onToggleNote={onToggleNote}
          />
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 text-slate-700 py-3 font-semibold text-sm hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
