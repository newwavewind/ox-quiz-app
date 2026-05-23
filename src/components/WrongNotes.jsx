import { useState } from 'react'
import StudyMode from './StudyMode'

export default function WrongNotes({ exams, progress, onUpdateProgress, onBack }) {
  const [reviewing, setReviewing] = useState(false)
  const [masteredIds, setMasteredIds] = useState(new Set())

  const displayExams = exams.filter(q => !masteredIds.has(q.id))

  const handleUpdateProgress = (examId, result) => {
    onUpdateProgress(examId, result)
    if (result.correct) {
      setTimeout(() => setMasteredIds(prev => new Set([...prev, examId])), 600)
    }
  }

  if (reviewing) {
    return (
      <StudyMode
        exams={displayExams}
        progress={progress}
        filter={{ category: null, year: null, status: 'all', sort: 'number' }}
        allExams={exams}
        onUpdateProgress={handleUpdateProgress}
        onBack={() => setReviewing(false)}
        onFilterChange={() => {}}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 font-bold text-slate-800">오답노트</h1>
          <span className="text-xs bg-red-100 text-red-600 rounded-full px-2.5 py-1 font-medium">
            {displayExams.length}문항
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {displayExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">오답이 없습니다!</h2>
            <p className="text-slate-500 text-sm mb-6">모든 문항을 맞혔어요.</p>
            <button onClick={onBack} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold">
              홈으로
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setReviewing(true)}
              className="w-full bg-red-500 text-white rounded-2xl py-4 font-bold text-base mb-5 hover:bg-red-600 transition-colors"
            >
              오답 전체 복습 ({displayExams.length}문항)
            </button>

            <div className="space-y-3">
              {displayExams.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setReviewing(true)}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-xs bg-red-100 text-red-600 rounded-full px-2.5 py-0.5 font-medium">
                      오답
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5">
                      {q.category}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {q.year}년 제{q.round}회 · {q.question_no}번
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-snug line-clamp-2">{q.stem}</p>
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
