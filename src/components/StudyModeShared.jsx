import {
  evaluatePastExamScore,
  PAST_EXAM_GWAKJAK_MIN_CORRECT,
  PAST_EXAM_PASS_MIN_CORRECT,
  PAST_EXAM_PASS_SCORE,
  PAST_EXAM_POINTS_PER_QUESTION,
  PAST_EXAM_TOTAL_POINTS,
} from '../data/pastExamGrade'

/** 기출 채점 표시: 문항 번호 주변, 색연필 손채점 느낌 */
export function PastExamGradeMark({ correct }) {
  return (
    <span
      className={`past-exam-grade-mark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3.5rem] h-[3.5rem] pointer-events-none select-none ${
        correct ? '-rotate-[6deg]' : '-rotate-[3deg]'
      }`}
      aria-label={correct ? '정답' : '오답'}
      role="img"
    >
      <svg viewBox="0 0 52 52" className="w-full h-full overflow-visible" fill="none" aria-hidden>
        <defs>
          <filter id="past-exam-pencil-rough" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" result="noise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="0.65"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <g filter="url(#past-exam-pencil-rough)">
          {correct ? (
            <path
              d="M26 8c11 2 17 10 15 19-2 11-12 18-22 16-10-2-15-11-12-19 3-9 12-14 19-16z"
              stroke="#e57373"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M9 38c4-2 14-14 28-26 8-6 12-8 14-9"
              stroke="#e57373"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>
    </span>
  )
}

/** 지문 앞 문항 번호 — 채점 도장은 번호 위에 겹쳐 표시(줄 높이 유지) */
export function QuestionNumberPrefix({ questionNo, gradeCorrect = null }) {
  return (
    <span className="relative inline align-baseline font-bold text-slate-800">
      {gradeCorrect != null && <PastExamGradeMark correct={gradeCorrect} />}
      <span className="relative z-[1]">{questionNo}. </span>
    </span>
  )
}

export function PastExamScoreSheet({
  exams,
  results,
  summary,
  onClose,
  onExit,
  onRetryWrong,
  onRetryCorrect,
  showPassCriteria = true,
}) {
  const wrongCount = exams.filter(e => results[e.id] && !results[e.id].questionCorrect).length
  const correctCount = exams.filter(e => results[e.id]?.questionCorrect).length
  const ungradedCount = exams.filter(e => !results[e.id]).length
  const evalResult = evaluatePastExamScore(summary.questionCorrect, summary.questionTotal)
  const pct =
    summary.questionTotal > 0
      ? Math.round((summary.questionCorrect / summary.questionTotal) * 100)
      : 0

  const statusColors = evalResult.passed
    ? {
        ring: 'stroke-emerald-500',
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30',
        badge: 'bg-emerald-600 text-white',
        accent: 'text-emerald-700 dark:text-emerald-300',
      }
    : {
        ring: 'stroke-rose-500',
        bg: 'bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/30',
        badge: 'bg-rose-600 text-white',
        accent: 'text-rose-700 dark:text-rose-300',
      }

  const scoreProgress = Math.min(100, (evalResult.score / PAST_EXAM_TOTAL_POINTS) * 100)
  const passLinePct = (PAST_EXAM_PASS_SCORE / PAST_EXAM_TOTAL_POINTS) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-labelledby="past-exam-score-title"
        className="relative w-full max-w-lg max-h-[min(88vh,36rem)] flex flex-col rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/80 dark:border-slate-600 overflow-hidden"
      >
        <div
          className={`shrink-0 px-5 pt-5 pb-4 border-b border-slate-200/60 dark:border-slate-600/60 ${
            showPassCriteria
              ? statusColors.bg
              : 'bg-slate-50 dark:bg-slate-800/80'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                채점 결과
              </p>
              {showPassCriteria ? (
                <h2 id="past-exam-score-title" className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {evalResult.score}점
                  <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                    {' '}
                    / {PAST_EXAM_TOTAL_POINTS}점
                  </span>
                </h2>
              ) : (
                <h2 id="past-exam-score-title" className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">
                  {summary.questionCorrect}
                  <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                    {' '}
                    / {summary.questionTotal} 문항 정답
                  </span>
                  <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {pct}%
                  </span>
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-700/80 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {showPassCriteria && (
            <>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className="stroke-slate-200 dark:stroke-slate-600"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      className={statusColors.ring}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${scoreProgress} 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-bold leading-none ${statusColors.accent}`}>
                      {summary.questionCorrect}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">/ {summary.questionTotal}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${statusColors.badge}`}
                  >
                    {evalResult.statusLabel}
                  </span>
                  <p className={`text-xs leading-relaxed ${statusColors.accent}`}>{evalResult.statusDetail}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    문항당 {PAST_EXAM_POINTS_PER_QUESTION}점 · 합격 {PAST_EXAM_PASS_SCORE}점(
                    {PAST_EXAM_PASS_MIN_CORRECT}
                    문항+) · 과락 {PAST_EXAM_GWAKJAK_MIN_CORRECT}문항 미만
                  </p>
                </div>
              </div>

              <div className="relative mt-3 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-600/80 overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    evalResult.passed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${scoreProgress}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500/90"
                  style={{ left: `${passLinePct}%` }}
                  title={`합격선 ${PAST_EXAM_PASS_SCORE}점`}
                />
              </div>
            </>
          )}
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-2 py-1.5 text-center">
              <p className="text-sm font-bold leading-tight text-emerald-700 dark:text-emerald-300">
                {summary.questionCorrect}
              </p>
              <p className="text-[9px] font-medium text-emerald-600/80">정답</p>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 px-2 py-1.5 text-center">
              <p className="text-sm font-bold leading-tight text-rose-700 dark:text-rose-300">{wrongCount}</p>
              <p className="text-[9px] font-medium text-rose-600/80">오답</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 px-2 py-1.5 text-center">
              <p className="text-sm font-bold leading-tight text-slate-600 dark:text-slate-300">{ungradedCount}</p>
              <p className="text-[9px] font-medium text-slate-500">미채점</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">문항별 결과</p>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-0.5">
            {exams.map(e => {
              const r = results[e.id]
              let chipClass = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
              let mark = '·'
              if (r) {
                if (r.questionCorrect) {
                  chipClass =
                    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                  mark = '○'
                } else {
                  chipClass =
                    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                  mark = '×'
                }
              }
              return (
                <span
                  key={e.id}
                  className={`inline-flex items-center gap-0.5 min-w-[2.75rem] justify-center px-1.5 py-1 rounded-lg border text-[11px] font-bold ${chipClass}`}
                >
                  {e.question_no}
                  <span className="text-[9px] opacity-80">{mark}</span>
                </span>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 px-5 pb-4 pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          {(onRetryCorrect && correctCount > 0) || (onRetryWrong && wrongCount > 0) ? (
            <div className="grid grid-cols-2 gap-1.5">
              {onRetryCorrect && correctCount > 0 ? (
                <button
                  type="button"
                  onClick={onRetryCorrect}
                  className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  <span>맞춘 문제</span>
                  <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-px rounded-full">
                    {correctCount}
                  </span>
                </button>
              ) : (
                <span />
              )}
              {onRetryWrong && wrongCount > 0 ? (
                <button
                  type="button"
                  onClick={onRetryWrong}
                  className="flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  <span>오답 보기</span>
                  <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-px rounded-full">
                    {wrongCount}
                  </span>
                </button>
              ) : (
                <span />
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg py-2 font-medium text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onExit()
              }}
              className="rounded-lg py-2 font-medium text-xs bg-slate-800 hover:bg-slate-900 text-white transition-colors"
            >
              시험 탭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
