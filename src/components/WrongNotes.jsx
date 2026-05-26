import { useState } from 'react'
import StudyMode from './StudyMode'
import { clearStudyResume } from '../data/studyResume'

const WRONG_NOTES_RESUME_KEY = 'wrongnotes'

export default function WrongNotes({
  exams,
  allExams,
  progress,
  onUpdateProgress,
  onLogItemAttempt,
  onClearItemAttempts,
  onRemoveItemAttempt,
  savedNotes = {},
  onToggleNote,
  onBack,
  appearance = null,
  onAppearanceChange,
}) {
  const [reviewing, setReviewing] = useState(false)
  const [reviewExams, setReviewExams] = useState([])
  const [startExamId, setStartExamId] = useState(null)
  const [masteredIds, setMasteredIds] = useState(new Set())

  const displayExams = exams.filter(q => !masteredIds.has(q.id))

  const handleUpdateProgress = (examId, result) => {
    onUpdateProgress(examId, result)
    if (result.correct) {
      setTimeout(() => setMasteredIds(prev => new Set([...prev, examId])), 600)
    }
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
          <h1 className="flex-1 font-bold text-slate-800 dark:text-slate-100">오답노트</h1>
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
              className="w-full bg-red-500 text-white rounded-2xl py-4 font-bold text-base mb-5 hover:bg-red-600 transition-colors"
            >
              오답 전체 복습 ({displayExams.length}문항)
            </button>

            <div className="space-y-3">
              {displayExams.map(q => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => startReview(q.id)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left hover:border-red-300 hover:shadow-sm transition-all"
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
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
