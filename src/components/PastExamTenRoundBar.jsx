import {
  PAST_EXAM_INFINITE_ROUND,
  PAST_EXAM_ROUND_MAX,
} from '../data/pastExamRounds'

const ROUND_COLUMN_CLASS =
  'flex flex-col items-center min-w-0 w-full min-h-[10.5rem]'

const ROUNDS = Array.from({ length: PAST_EXAM_ROUND_MAX }, (_, i) => i + 1)

function statusMeta(rec) {
  if (rec?.passed) {
    return {
      label: '합격',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25',
      card: 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/30 dark:to-slate-800 dark:border-emerald-800/50',
    }
  }
  if (rec?.hasGwakjak) {
    return {
      label: '과락',
      badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/25',
      card: 'border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white dark:from-amber-950/30 dark:to-slate-800 dark:border-amber-800/50',
    }
  }
  return {
    label: '불합격',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/25',
    card: 'border-rose-200/80 bg-gradient-to-b from-rose-50/90 to-white dark:from-rose-950/30 dark:to-slate-800 dark:border-rose-800/50',
  }
}

export default function PastExamTenRoundBar({
  roundsData = {},
  activeRound = null,
  onStartRound,
  onViewResult,
  onRetryWrong,
  onRetryCorrect,
  onScrollToTop,
  onCertifyRound5,
}) {
  const infiniteRec = roundsData[PAST_EXAM_INFINITE_ROUND]
  const infiniteActive = activeRound === PAST_EXAM_INFINITE_ROUND
  const infiniteDone = infiniteRec?.completed
  const infiniteStatus = infiniteDone ? statusMeta(infiniteRec) : null
  const infiniteScoreText =
    infiniteRec?.score != null
      ? `${infiniteRec.score}점`
      : infiniteDone
        ? `${infiniteRec.questionCorrect}/${infiniteRec.questionTotal}`
        : null
  const showInfinite = Boolean(roundsData[PAST_EXAM_ROUND_MAX]?.completed)

  const roundBarTitle = onScrollToTop ? (
    <button
      type="button"
      onClick={onScrollToTop}
      className="text-lg font-extrabold tracking-wide text-slate-700 dark:text-slate-200 touch-manipulation"
      aria-label="맨 위로"
    >
      5회독
    </button>
  ) : (
    <p className="text-lg font-extrabold tracking-wide text-slate-700 dark:text-slate-200">
      5회독
    </p>
  )

  return (
    <div className="shrink-0 bg-white/90 dark:bg-slate-800/95 border-b border-slate-100 dark:border-slate-700 py-3.5 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-3">
        <div className="flex items-center justify-center gap-2 min-h-[2.75rem] mb-1">
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-600" />
          {roundBarTitle}
          <span className="h-px flex-1 max-w-[4rem] bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-600" />
        </div>

        <div className="grid grid-cols-5 gap-2 w-full pt-0.5">
          {ROUNDS.map(n => {
            const rec = roundsData[n]
            const isActive = activeRound === n
            const isDone = rec?.completed
            const status = isDone ? statusMeta(rec) : null
            const scoreText =
              rec?.score != null
                ? `${rec.score}점`
                : isDone
                  ? `${rec.questionCorrect}/${rec.questionTotal}`
                  : null

            if (isDone && !isActive) {
              return (
                <div key={n} className={ROUND_COLUMN_CLASS}>
                  <div
                    className={`w-full flex-1 flex flex-col min-h-0 rounded-2xl border shadow-sm overflow-hidden ${status.card}`}
                  >
                  <div className="px-2 pt-2.5 pb-2 text-center flex-1 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{n}회독</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tabular-nums leading-none">
                      {scoreText}
                    </p>
                    <span
                      className={`mx-auto inline-flex items-center justify-center mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ring-1 ring-inset ${status.badge}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex border-t border-slate-200/60 dark:border-slate-600/60 divide-x divide-slate-200/60 dark:divide-slate-600/60">
                    <button
                      type="button"
                      onClick={() => onViewResult(n)}
                      className="flex-1 py-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors"
                    >
                      채점
                    </button>
                    {rec.questionCorrect > 0 && onRetryCorrect ? (
                      <button
                        type="button"
                        onClick={() => onRetryCorrect(n)}
                        className="flex-1 py-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        정답
                        <span className="block text-[9px] font-bold opacity-80">{rec.questionCorrect}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2 text-[10px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                    {rec.wrongCount > 0 && onRetryWrong ? (
                      <button
                        type="button"
                        onClick={() => onRetryWrong(n)}
                        className="flex-1 py-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        오답
                        <span className="block text-[9px] font-bold opacity-80">{rec.wrongCount}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2 text-[10px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                  </div>
                  </div>
                  {n === 5 && onCertifyRound5 && (
                    <button
                      type="button"
                      onClick={onCertifyRound5}
                      className="w-full mt-1.5 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      5회독 인증하기
                    </button>
                  )}
                </div>
              )
            }

            return (
              <div key={n} className={ROUND_COLUMN_CLASS}>
              <button
                type="button"
                onClick={() => onStartRound(n)}
                className={`w-full flex-1 min-h-[5.25rem] relative flex flex-col items-center justify-center rounded-2xl border-2 px-1 py-2.5 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/15 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-700/40 hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                )}
                <span
                  className={`text-xs font-bold ${isActive ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  {n}회독
                </span>
                {isActive ? (
                  <span className="mt-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                    진행 중
                  </span>
                ) : (
                  <span className="mt-1 text-[9px] font-medium text-slate-400 dark:text-slate-500">시작</span>
                )}
              </button>
              </div>
            )
          })}
        </div>

        {showInfinite && (
          <div className="mt-2.5 w-full">
            {infiniteDone && !infiniteActive ? (
              <div className="w-full flex flex-col min-h-0">
                <div
                  className={`w-full flex flex-col min-h-0 rounded-2xl border shadow-sm overflow-hidden ${infiniteStatus.card}`}
                >
                  <div className="px-3 pt-3 pb-2.5 text-center">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">회독무한반복</p>
                    <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tabular-nums leading-none">
                      {infiniteScoreText}
                    </p>
                    <span
                      className={`mx-auto inline-flex items-center justify-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ring-1 ring-inset ${infiniteStatus.badge}`}
                    >
                      {infiniteStatus.label}
                    </span>
                  </div>
                  <div className="flex border-t border-slate-200/60 dark:border-slate-600/60 divide-x divide-slate-200/60 dark:divide-slate-600/60">
                    <button
                      type="button"
                      onClick={() => onViewResult(PAST_EXAM_INFINITE_ROUND)}
                      className="flex-1 py-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors"
                    >
                      채점
                    </button>
                    {infiniteRec.questionCorrect > 0 && onRetryCorrect ? (
                      <button
                        type="button"
                        onClick={() => onRetryCorrect(PAST_EXAM_INFINITE_ROUND)}
                        className="flex-1 py-2.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        정답
                        <span className="block text-[10px] font-bold opacity-80">{infiniteRec.questionCorrect}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2.5 text-[11px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                    {infiniteRec.wrongCount > 0 && onRetryWrong ? (
                      <button
                        type="button"
                        onClick={() => onRetryWrong(PAST_EXAM_INFINITE_ROUND)}
                        className="flex-1 py-2.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        오답
                        <span className="block text-[10px] font-bold opacity-80">{infiniteRec.wrongCount}</span>
                      </button>
                    ) : (
                      <span className="flex-1 py-2.5 text-[11px] font-medium text-slate-300 dark:text-slate-600 text-center">
                        —
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartRound(PAST_EXAM_INFINITE_ROUND)}
                  className="w-full mt-1.5 py-2.5 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
                >
                  다시 시작
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onStartRound(PAST_EXAM_INFINITE_ROUND)}
                className={`w-full min-h-[4.5rem] relative flex flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 transition-all ${
                  infiniteActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/15 scale-[1.01]'
                    : 'border-violet-200 dark:border-violet-700 bg-violet-50/80 dark:bg-violet-950/30 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 hover:shadow-sm'
                }`}
              >
                {infiniteActive && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                )}
                <span
                  className={`text-sm font-bold ${infiniteActive ? 'text-indigo-800 dark:text-indigo-200' : 'text-violet-800 dark:text-violet-200'}`}
                >
                  회독무한반복
                </span>
                <span
                  className={`mt-1 text-[10px] font-medium ${infiniteActive ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-violet-600/80 dark:text-violet-300/80'}`}
                >
                  {infiniteActive ? '진행 중' : '5회독 완료 후 추가 연습'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
