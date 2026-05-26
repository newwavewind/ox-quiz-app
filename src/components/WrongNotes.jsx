import { useEffect, useMemo, useState } from 'react'
import StudyMode from './StudyMode'
import { clearStudyResume } from '../data/studyResume'
import { sortWrongExams } from '../data/loadExam'

const WRONG_NOTES_RESUME_KEY = 'wrongnotes'
const PAGE_SIZE = 10

function WrongNoteDismissModal({ onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-xl border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-labelledby="wrong-note-dismiss-title"
      >
        <p id="wrong-note-dismiss-title" className="text-base font-bold text-center text-slate-800 dark:text-slate-100">
          정말 삭제 하시겠습니까?
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1.5">
          풀이 기록은 유지됩니다
        </p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WrongNotes({
  kind = 'year',
  exams,
  allExams,
  progress,
  onUpdateProgress,
  onLogItemAttempt,
  onClearItemAttempts,
  onRemoveItemAttempt,
  savedNotes = {},
  onToggleNote,
  onDismissWrongNote,
  onBack,
  appearance = null,
  onAppearanceChange,
}) {
  const [reviewing, setReviewing] = useState(false)
  const [reviewExams, setReviewExams] = useState([])
  const [startExamId, setStartExamId] = useState(null)
  const [masteredIds, setMasteredIds] = useState(new Set())
  const [dismissedIds, setDismissedIds] = useState(new Set())
  const [sortOrder, setSortOrder] = useState('recent')
  const [page, setPage] = useState(1)
  const [pendingDismissId, setPendingDismissId] = useState(null)

  const displayExams = useMemo(
    () =>
      sortWrongExams(
        exams.filter(q => !masteredIds.has(q.id) && !dismissedIds.has(q.id)),
        progress,
        sortOrder
      ),
    [exams, masteredIds, dismissedIds, progress, sortOrder]
  )

  const totalPages = Math.max(1, Math.ceil(displayExams.length / PAGE_SIZE))

  const pagedExams = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return displayExams.slice(start, start + PAGE_SIZE)
  }, [displayExams, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleUpdateProgress = (examId, result) => {
    onUpdateProgress(examId, result)
    if (result.correct) {
      setTimeout(() => setMasteredIds(prev => new Set([...prev, examId])), 600)
    }
  }

  const confirmDismiss = () => {
    if (!pendingDismissId) return
    onDismissWrongNote?.(pendingDismissId)
    setDismissedIds(prev => new Set([...prev, pendingDismissId]))
    setPendingDismissId(null)
  }

  const startReview = (examId = null) => {
    clearStudyResume(WRONG_NOTES_RESUME_KEY)
    if (examId) {
      const target = displayExams.find(e => e.id === examId)
      setReviewExams(target ? [target] : displayExams)
      setStartExamId(examId)
    } else {
      setReviewExams(displayExams)
      setStartExamId(null)
    }
    setReviewing(true)
  }

  const exitReview = () => {
    setReviewing(false)
    setReviewExams([])
    setStartExamId(null)
  }

  if (reviewing && reviewExams.length > 0) {
    return (
      <StudyMode
        key={startExamId ?? 'all'}
        exams={reviewExams}
        startExamId={startExamId}
        resumeStorageKey={WRONG_NOTES_RESUME_KEY}
        progress={progress}
        filter={{ category: null, year: null, status: 'all', sort: 'number' }}
        allExams={allExams}
        onUpdateProgress={handleUpdateProgress}
        onLogItemAttempt={onLogItemAttempt}
        onClearItemAttempts={onClearItemAttempts}
        onRemoveItemAttempt={onRemoveItemAttempt}
        savedNotes={savedNotes}
        onToggleNote={onToggleNote}
        onBack={exitReview}
        onFilterChange={() => {}}
        exitLabel="오답노트로"
        appearance={appearance}
        onAppearanceChange={onAppearanceChange}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-bottom-nav">
      <div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 font-bold text-slate-800 dark:text-slate-100">
            {kind === 'year' ? '오답노트' : '오답노트 · 목차별'}
          </h1>
          <span className="text-xs bg-red-100 text-red-600 rounded-full px-2.5 py-1 font-medium">
            {displayExams.length}문항
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {displayExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">오답이 없습니다!</h2>
            <p className="text-slate-500 text-sm mb-6">모든 문항을 맞혔어요.</p>
            <button type="button" onClick={onBack} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold">
              홈으로
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => startReview()}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold text-base mb-5 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              오답 전체 복습 ({displayExams.length}문항)
            </button>

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5 bg-slate-100 dark:bg-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder('recent')
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    sortOrder === 'recent'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  최신순
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder('oldest')
                    setPage(1)
                  }}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    sortOrder === 'oldest'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  오래된순
                </button>
              </div>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {page} / {totalPages}페이지
              </p>
            </div>

            <div className="space-y-3">
              {pagedExams.map(q => (
                <div
                  key={q.id}
                  className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => startReview(q.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className="text-xs bg-red-100 text-red-600 rounded-full px-2.5 py-0.5 font-medium">
                        오답
                      </span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full px-2.5 py-0.5">
                        {q.category}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {q.year}년 제{q.round}회 · {q.question_no}번
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">{q.stem}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {progress[q.id]?.attempts || 0}번 시도
                    </p>
                  </button>
                  {onDismissWrongNote && (
                    <button
                      type="button"
                      onClick={() => setPendingDismissId(q.id)}
                      className="shrink-0 self-start p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      aria-label="오답노트에서 제거"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  이전
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                        n === page
                          ? 'bg-red-500 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {pendingDismissId && (
        <WrongNoteDismissModal
          onCancel={() => setPendingDismissId(null)}
          onConfirm={confirmDismiss}
        />
      )}
    </div>
  )
}
