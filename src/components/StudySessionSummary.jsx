export default function StudySessionSummary({
  summary,
  onContinue,
  onRetryWrong,
  onExit,
}) {
  if (!summary || summary.total === 0) return null

  const rate =
    summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onContinue} aria-hidden />
      <div
        role="dialog"
        aria-labelledby="session-summary-title"
        className="relative bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <h2 id="session-summary-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
          학습 요약
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          이번 세션에서 {summary.total}문항을 학습했습니다.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 py-3">
            <p className="text-xs text-slate-400">풀이</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{summary.total}</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-950/30 py-3">
            <p className="text-xs text-green-600">정답</p>
            <p className="text-xl font-bold text-green-700 tabular-nums">{summary.correct}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 py-3">
            <p className="text-xs text-red-600">오답</p>
            <p className="text-xl font-bold text-red-700 tabular-nums">{summary.wrong}</p>
          </div>
        </div>

        <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          정답률 {rate}%
        </p>

        {summary.wrongNumbers?.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
            틀린 문항: {summary.wrongNumbers.join(', ')}번
          </p>
        )}

        <div className="space-y-2">
          {summary.wrong > 0 && onRetryWrong && (
            <button
              type="button"
              onClick={onRetryWrong}
              className="w-full bg-red-500 text-white rounded-xl py-3.5 font-bold hover:bg-red-600"
            >
              틀린 {summary.wrong}문항만 다시
            </button>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-3 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            계속 학습
          </button>
          <button
            type="button"
            onClick={onExit}
            className="w-full text-slate-500 dark:text-slate-400 py-2 text-sm font-medium hover:text-slate-700"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  )
}
