import { useMemo } from 'react'
import { RANDOM_EXAM_COUNTS } from '../data/randomExamSet'
import BomGichulWordmark from './BomGichulWordmark'

function ExamWrongNoteInlineHint({ checked = true }) {
  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        readOnly
        tabIndex={-1}
        aria-hidden
        className="inline-block rounded border-slate-300 text-rose-600 focus:ring-rose-400 pointer-events-none align-[-0.12em] mr-[0.2em] w-[0.95em] h-[0.95em] shrink-0"
      />
      <span className="font-semibold">오답노트</span>
    </>
  )
}

export default function ExamScreen({
  exams,
  onStartPastExam,
  onStartRandom,
  onOpenStats,
  examWrongNoteEntries = [],
  onStartExamWrongNotesStudy,
}) {
  const canStartRandom = exams.length >= 5 && onStartRandom

  const activeYears = useMemo(() => {
    const byYear = new Map()
    for (const q of exams) {
      if (!byYear.has(q.year)) {
        byYear.set(q.year, { year: q.year, round: q.round, count: 0 })
      }
      byYear.get(q.year).count += 1
    }
    return [...byYear.values()].sort((a, b) => b.year - a.year)
  }, [exams])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-bottom-nav">
      <div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex-1 text-left touch-manipulation min-w-0"
            aria-label="맨 위로"
          >
            <BomGichulWordmark suffix="시험 모드" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">회차별 기출 · 랜덤 세트</p>
          </button>
          {onOpenStats && (
            <button
              type="button"
              onClick={onOpenStats}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl home-today-stats-btn px-2.5 py-1.5 text-[11px] font-bold shadow-sm active:scale-[0.98] transition-all"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              출제 통계
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-4 space-y-3">
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">기출문제 풀기</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              회차별 40문항을 순서대로 풉니다. 답을 고른 뒤 「정답 확인」으로 채점·해설을 확인합니다.
            </p>
          </div>
          {activeYears.length > 0 && onStartPastExam ? (
            <div className="grid grid-cols-2 gap-2">
              {activeYears.map(({ year, round, count }) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => onStartPastExam(year)}
                  className="flex flex-col items-center justify-center min-h-[3.25rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-3 text-center hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 active:scale-[0.99] transition-all"
                >
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{year}년</span>
                  {round != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">제{round}회</span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{count}문항</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              기출 데이터가 없습니다.
            </p>
          )}
        </section>

        {canStartRandom ? (
          <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-4 space-y-3">
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">랜덤 문제 풀기</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                2016~2025년 기출 중 소분류 출제 빈도를 반영해 뽑습니다. 기출과 같이 스크롤하며 풀고
                「정답 확인」으로 채점합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RANDOM_EXAM_COUNTS.map(n => {
                const disabled = exams.length < n
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onStartRandom(n)}
                    className={`flex flex-col items-center justify-center min-h-[3.25rem] rounded-xl border px-3 py-3 text-center transition-all active:scale-[0.99] ${
                      disabled
                        ? 'border-slate-200 dark:border-slate-600 bg-slate-50/50 text-slate-400 cursor-not-allowed dark:bg-slate-800/40'
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      랜덤 {n}문제
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">출제빈도 반영</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{n}문항</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            랜덤 시험을 시작하려면 문제 데이터가 5문항 이상 필요합니다.
          </p>
        )}

        <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-4 space-y-3">
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">오답노트</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              기출·랜덤 풀이 중 <ExamWrongNoteInlineHint />로 모은 문항입니다. 모아서 다시 풀 수
              있습니다.
            </p>
          </div>

          {examWrongNoteEntries.length > 0 ? (
            <button
              type="button"
              onClick={onStartExamWrongNotesStudy}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-center hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 active:scale-[0.99] transition-all"
            >
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                전체 복습 · {examWrongNoteEntries.length}문항
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                각 문항 「정답 확인」으로 바로 채점
              </span>
            </button>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
              아직 담은 문항이 없습니다.
              <br />
              기출·랜덤 풀이 화면에서 <ExamWrongNoteInlineHint checked={false} />를 체크해 추가하세요.
            </p>
          )}
        </section>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-800 dark:text-slate-100">안내</p>
          <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
            <li>기출문제 풀기는 보기·선택지를 고른 뒤 일괄 채점합니다 (O/X 버튼 없음).</li>
            <li>랜덤 문제는 5~40문항, 기출과 같은 방식으로 풀고 일괄 채점합니다.</li>
            <li>목차별·오답 학습은 「학습」 탭에서 이용하세요.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
