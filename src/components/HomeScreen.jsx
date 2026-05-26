import { useMemo, useState } from 'react'
import { isExamComplete, isExamCorrect } from '../data/loadExam'
import { buildTodayDashboard } from '../data/studyDashboard'
import { formatTodayStudySpot } from '../data/todayStudySpot'
import {
  CURRICULUM,
  PART_STYLES,
  filterExamsByChapter,
  getChapterSections,
  countCurriculumChapters,
} from '../data/curriculum'

const STUDY_VIEWS = {
  year: { label: '기출연도별 학습', todayTitle: '기출연도별' },
  category: { label: '목차별 학습', todayTitle: '목차별' },
}

function ProgressBadge({ answered, total, rate, variant = 'default' }) {
  if (variant === 'year') {
    const progressRate = total > 0 ? Math.round((answered / total) * 100) : 0
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-lg border border-indigo-300/80 dark:border-indigo-600 bg-white/95 dark:bg-indigo-950/60 px-1.5 py-0.5 tabular-nums shadow-sm">
        <span className="text-xs font-extrabold leading-none text-indigo-700 dark:text-indigo-200">
          {progressRate}%
        </span>
        <span className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400">
          {answered}/{total}
        </span>
      </span>
    )
  }

  if (answered === 0) return null

  const progressRate = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
      {answered}/{total} · {progressRate}%
    </span>
  )
}

function MetaDivider() {
  return (
    <span
      className="shrink-0 w-px h-3 bg-slate-300/80 dark:bg-slate-500/60 self-center"
      aria-hidden
    />
  )
}

function StudyViewSwitcher({ view, onChange }) {
  const goPrev = () => onChange(view === 'year' ? 'category' : 'year')
  const goNext = () => onChange(view === 'year' ? 'category' : 'year')

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={goPrev}
        aria-label={view === 'year' ? '목차별 학습으로' : '기출연도별 학습으로'}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <p className="flex-1 py-2.5 px-2 rounded-xl text-sm font-semibold border text-center bg-slate-800 text-white border-slate-800">
        {STUDY_VIEWS[view].label}
      </p>
      <button
        type="button"
        onClick={goNext}
        aria-label={view === 'year' ? '목차별 학습으로' : '기출연도별 학습으로'}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function TodayStudyPanel({ title, spot, spotLabel, onResume }) {
  const content = (
    <>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      {spotLabel ? (
        <p className="mt-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 leading-snug">
          {spotLabel}
        </p>
      ) : (
        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">오늘 학습 없음</p>
      )}
    </>
  )

  if (spotLabel && spot && onResume) {
    return (
      <button
        type="button"
        onClick={() => onResume(spot)}
        className="w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2.5 px-2 text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 py-2.5 px-2 text-center">
      {content}
    </div>
  )
}

function CurriculumPartBlock({
  part,
  exams,
  getExamStats,
  expandedParts,
  togglePart,
  expandedChapters,
  toggleChapterSections,
  onStartStudy,
}) {
  const style = PART_STYLES[part.style] ?? PART_STYLES.blue
  const partOpen = expandedParts.has(part.id)

  return (
    <div className="space-y-1.5 min-w-0">
      <button
        type="button"
        onClick={() => togglePart(part.id)}
        aria-expanded={partOpen}
        className={`w-full rounded-xl px-2.5 py-2 text-left text-[11px] font-bold border ${style.header}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="leading-tight line-clamp-2">{part.label}</span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${partOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {partOpen && (
        <div className="space-y-1.5 pl-0.5">
          {part.chapters.map((chapter, chapterIndex) => {
            const chapterExams = filterExamsByChapter(exams, chapter)
            const chapterStats = getExamStats(chapterExams)
            const sections = getChapterSections(chapter)
            const sectionsOpen = expandedChapters.has(chapter.id)
            const orderNo = String(chapterIndex + 1).padStart(2, '0')

            return (
              <div
                key={chapter.id}
                className={`${style.light} ${style.border} border rounded-xl p-2.5 hover:shadow-sm transition-all`}
              >
                <div className="flex items-center gap-1.5 min-h-5">
                  <button
                    type="button"
                    onClick={() =>
                      onStartStudy({
                        chapterId: chapter.id,
                        category: null,
                        subcategory: null,
                      })
                    }
                    disabled={chapterStats.total === 0}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left active:scale-[0.99] transition-transform disabled:opacity-50 min-h-5"
                  >
                    <span className={`shrink-0 w-5 h-5 rounded-md bg-white flex items-center justify-center text-[9px] font-bold ${style.text}`}>
                      {orderNo}
                    </span>
                    <div className="flex-1 min-w-0 min-h-5 flex items-center">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <p className={`min-w-0 text-[10px] sm:text-[11px] font-bold ${style.text} leading-snug line-clamp-2`}>
                          {chapter.shortLabel}
                        </p>
                        {chapterStats.answered > 0 && (
                          <>
                            <MetaDivider />
                            <ProgressBadge
                              answered={chapterStats.answered}
                              total={chapterStats.total}
                              rate={chapterStats.rate}
                            />
                          </>
                        )}
                        <MetaDivider />
                        <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {chapterStats.total}문항
                        </span>
                      </div>
                    </div>
                  </button>
                  {sections.length > 1 && (
                    <>
                      <MetaDivider />
                      <button
                        type="button"
                        onClick={() => toggleChapterSections(chapter.id)}
                        aria-expanded={sectionsOpen}
                        aria-label={`${chapter.shortLabel} 소분류 ${sectionsOpen ? '접기' : '펼치기'}`}
                        className={`shrink-0 h-5 flex items-center rounded-md border px-1.5 text-[9px] font-bold leading-none shadow-sm transition-colors ${
                          sectionsOpen
                            ? `bg-white dark:bg-slate-900 ${style.border} ${style.text}`
                            : `bg-white/90 dark:bg-slate-900/70 ${style.border} ${style.text} hover:bg-white dark:hover:bg-slate-900`
                        }`}
                      >
                        {sectionsOpen ? '접기' : '펼치기'}
                      </button>
                    </>
                  )}
                </div>
                {sections.length > 1 && sectionsOpen && (
                  <ul className="mt-2 space-y-0.5 border-t border-white/60 dark:border-slate-600/40 pt-2">
                    {sections.map(section => {
                      const sectionExams = chapterExams.filter(e =>
                        e.category === section.filter.category
                        && (section.filter.subcategory == null || e.subcategory === section.filter.subcategory)
                      )
                      const sectionStats = getExamStats(sectionExams)
                      return (
                        <li key={section.id}>
                          <button
                            type="button"
                            onClick={() =>
                              onStartStudy({
                                chapterId: chapter.id,
                                category: section.filter.category,
                                subcategory: section.filter.subcategory ?? null,
                              })
                            }
                            disabled={sectionStats.total === 0}
                            className="w-full flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-white/60 dark:hover:bg-slate-700/40 active:scale-[0.98] transition-all disabled:opacity-40"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                              <span className={`min-w-0 text-[10px] font-medium ${style.text} leading-tight line-clamp-2`}>
                                {section.label}
                              </span>
                              {sectionStats.answered > 0 && (
                                <>
                                  <MetaDivider />
                                  <ProgressBadge
                                    answered={sectionStats.answered}
                                    total={sectionStats.total}
                                    rate={sectionStats.rate}
                                  />
                                </>
                              )}
                              <MetaDivider />
                              <span className="shrink-0 text-[9px] text-slate-400 tabular-nums">
                                {sectionStats.total}문항
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HomeScreen({
  exams,
  progress,
  notes,
  wrongCounts = { year: 0, category: 0 },
  onStartStudy,
  onStartStudyByYear,
  onResumeTodayStudy,
  onOpenWrongNotes,
  onOpenStats,
}) {
  const getExamStats = (list) => {
    const answered = list.filter(q => isExamComplete(progress, q.id))
    const correct = list.filter(q => isExamCorrect(progress, q.id))
    const rate = answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0
    return {
      total: list.length,
      answered: answered.length,
      correct: correct.length,
      rate,
    }
  }

  const getYearStats = (year) => {
    const yearExams = exams.filter(q => q.year === year)
    const answered = yearExams.filter(q => isExamComplete(progress, q.id))
    const correct = yearExams.filter(q => isExamCorrect(progress, q.id))
    const rate = answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0
    const round = yearExams[0]?.round
    return {
      total: yearExams.length,
      answered: answered.length,
      correct: correct.length,
      rate,
      round,
    }
  }

  const activeYears = [...new Set(exams.map(q => q.year))]
    .sort((a, b) => b - a)
    .map(year => ({ year, ...getYearStats(year) }))

  const dashboard = useMemo(
    () => buildTodayDashboard(progress),
    [progress]
  )

  const yearSpotLabel = dashboard.todaySpots.year
    ? formatTodayStudySpot(dashboard.todaySpots.year, exams, progress)
    : null
  const categorySpotLabel = dashboard.todaySpots.category
    ? formatTodayStudySpot(dashboard.todaySpots.category, exams, progress)
    : null

  const [studyView, setStudyView] = useState('year')
  const [expandedParts, setExpandedParts] = useState(() => new Set(CURRICULUM.parts.map(p => p.id)))
  const [expandedChapters, setExpandedChapters] = useState(() => new Set())

  const togglePart = (partId) => {
    setExpandedParts(prev => {
      const next = new Set(prev)
      if (next.has(partId)) next.delete(partId)
      else next.add(partId)
      return next
    })
  }

  const toggleChapterSections = (chapterId) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  const chapterCount = countCurriculumChapters()

  const wrongNoteKinds = ['year', 'category'].filter(kind => (wrongCounts[kind] ?? 0) > 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-bottom-nav">
      <div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="block w-full max-w-2xl mx-auto px-4 py-4 text-left touch-manipulation"
          aria-label="맨 위로"
        >
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">공인중개사 민법</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">기출 OX · 연도별 · 목차별</p>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">오늘의 학습</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                오늘 OX {dashboard.todayOx}문항
              </p>
            </div>
            {onOpenStats && (
              <button
                type="button"
                onClick={onOpenStats}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-950/70 active:scale-[0.98] transition-all"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                출제 통계
              </button>
            )}
          </div>
          <TodayStudyPanel
            title={STUDY_VIEWS[studyView].todayTitle}
            spot={studyView === 'year' ? dashboard.todaySpots.year : dashboard.todaySpots.category}
            spotLabel={studyView === 'year' ? yearSpotLabel : categorySpotLabel}
            onResume={onResumeTodayStudy}
          />
        </section>

        {wrongNoteKinds.length > 0 && onOpenWrongNotes && (
          <div className={`grid gap-2 ${wrongNoteKinds.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {wrongNoteKinds.map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => onOpenWrongNotes(kind)}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  {`오답노트 · ${STUDY_VIEWS[kind].todayTitle}`}
                </span>
                <span className="shrink-0 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-rose-600 dark:text-rose-400 rounded-full px-2 py-1 tabular-nums">
                  {wrongCounts[kind]}문항
                </span>
              </button>
            ))}
          </div>
        )}

        <section className="space-y-2">
          <StudyViewSwitcher view={studyView} onChange={setStudyView} />

          {studyView === 'year' ? (
            <div className="grid grid-cols-2 gap-2">
              {activeYears.map(({ year, round, answered, total, rate }) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => onStartStudyByYear(year)}
                  className="w-full flex flex-col items-center justify-center min-h-[2.75rem] bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-center hover:shadow-md transition-all duration-150 active:scale-[0.99]"
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="text-base font-bold text-indigo-900">{year}년</span>
                    {round != null && (
                      <span className="text-xs font-medium text-indigo-600/90">제{round}회</span>
                    )}
                  </span>
                  <ProgressBadge answered={answered} total={total} rate={rate} variant="year" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 items-start">
                {CURRICULUM.parts.slice(0, 2).map(part => (
                  <CurriculumPartBlock
                    key={part.id}
                    part={part}
                    exams={exams}
                    getExamStats={getExamStats}
                    expandedParts={expandedParts}
                    togglePart={togglePart}
                    expandedChapters={expandedChapters}
                    toggleChapterSections={toggleChapterSections}
                    onStartStudy={onStartStudy}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 items-start">
                {CURRICULUM.parts.slice(2).map(part => (
                  <CurriculumPartBlock
                    key={part.id}
                    part={part}
                    exams={exams}
                    getExamStats={getExamStats}
                    expandedParts={expandedParts}
                    togglePart={togglePart}
                    expandedChapters={expandedChapters}
                    toggleChapterSections={toggleChapterSections}
                    onStartStudy={onStartStudy}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          총 {exams.length}문항 · {activeYears.length}개 연도 · {chapterCount}개 장
        </p>
      </div>
    </div>
  )
}
