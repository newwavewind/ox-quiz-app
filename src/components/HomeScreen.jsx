import { useMemo, useState } from 'react'
import { APP_TAGLINE } from '../data/brand'
import { isExamComplete, isExamCorrect } from '../data/loadExam'
import BomGichulWordmark from './BomGichulWordmark'
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

function getProgressState(progressRate) {
  if (progressRate === 0) return 'idle'
  if (progressRate === 100) return 'done'
  return 'active'
}

function StudyProgressBar({ progressRate, ariaLabel, className = 'mt-2' }) {
  const state = getProgressState(progressRate)
  const fillColor = state === 'done' ? '#10b981' : '#22c55e'

  return (
    <div
      className={`home-year-bar-wrap ${className}`}
      role="progressbar"
      aria-valuenow={progressRate}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      style={{
        display: 'block',
        width: '100%',
        height: 6,
        flexShrink: 0,
        borderRadius: 9999,
        overflow: 'hidden',
        backgroundColor: 'rgb(226 232 240)',
      }}
    >
      {progressRate > 0 && (
        <div
          className={`home-year-bar home-year-bar-${state}`}
          style={{
            display: 'block',
            height: 6,
            width: `${progressRate}%`,
            minWidth: 8,
            borderRadius: 9999,
            backgroundColor: fillColor,
          }}
        />
      )}
    </div>
  )
}

function YearStudyButton({ year, round, answered, total, onClick }) {
  const progressRate = total > 0 ? Math.round((answered / total) * 100) : 0
  const state = getProgressState(progressRate)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col items-stretch min-h-[2.75rem] home-year-btn rounded-xl px-3 pt-2.5 pb-2.5 text-left active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-bold tabular-nums leading-tight home-year-text-strong">
            {year}년
          </span>
          <span className="block text-[11px] home-year-text-soft mt-0.5">
            {round != null ? `제${round}회 · ` : ''}{total}문항
          </span>
        </span>
        <span className={`shrink-0 text-[11px] font-bold tabular-nums home-year-pct home-year-pct-${state}`}>
          {progressRate}%
        </span>
      </div>
      <StudyProgressBar
        progressRate={progressRate}
        ariaLabel={`${year}년 학습 진행률 ${progressRate}%`}
      />
    </button>
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

function WrongNoteShortcut({ count, onOpen }) {
  if (!count || !onOpen) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 hover:text-indigo-600 dark:hover:border-slate-600 dark:hover:text-indigo-400 transition-all active:scale-[0.98]"
    >
      오답노트
      <span className="tabular-nums text-rose-500/90 dark:text-rose-400/90">{count}문항</span>
    </button>
  )
}

function StudyViewSwitcher({ view, onChange }) {
  const tabClass = (active, id) => {
    if (!active) {
      return 'font-medium text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
    }
    return id === 'year'
      ? 'font-bold text-slate-900 dark:text-slate-100 border-indigo-500'
      : 'font-bold text-slate-900 dark:text-slate-100 border-violet-500'
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-700" role="tablist" aria-label="학습 보기">
      <div className="flex gap-4">
        {(['year', 'category']).map(id => {
          const active = view === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={`flex-1 pb-2.5 pt-1 text-sm text-center transition-colors border-b-2 -mb-px active:scale-[0.99] ${tabClass(active, id)}`}
            >
              {STUDY_VIEWS[id].label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TodayStudyPanel({ title, spot, spotLabel, onResume }) {
  const idleClass =
    'shrink-0 max-w-[min(100%,14rem)] rounded-xl home-today-panel py-0 px-2 text-right'

  if (spotLabel && spot && onResume) {
    const spotText = spotLabel.replace(/ 진행$/, '')
    return (
      <button
        type="button"
        onClick={() => onResume(spot)}
        className="home-today-resume-btn"
        aria-label={`${title} ${spotText} 이어하기`}
      >
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">{title}</p>
        <p className="mt-0.5 text-xs font-medium home-today-link leading-tight inline-flex items-center justify-end gap-0.5 w-full">
          <span className="truncate">{spotText}</span>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </p>
      </button>
    )
  }

  return (
    <div className={idleClass}>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{title}</p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 leading-tight">오늘 학습 없음</p>
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
        className={`w-full rounded-xl px-2.5 py-4 text-left text-[11px] font-bold border ${style.header}`}
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

            const progressRate = chapterStats.total > 0
              ? Math.round((chapterStats.answered / chapterStats.total) * 100)
              : 0
            const progressState = getProgressState(progressRate)

            return (
              <div
                key={chapter.id}
                className={`${style.light} ${style.border} border rounded-xl p-2.5 hover:shadow-sm transition-all`}
              >
                <div className="flex items-start gap-1.5">
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
                    className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className={`shrink-0 w-5 h-5 rounded-md bg-white flex items-center justify-center text-[9px] font-bold ${style.text}`}>
                        {orderNo}
                      </span>
                      <span className={`min-w-0 text-[11px] sm:text-sm font-bold ${style.text} leading-snug line-clamp-2`}>
                        {chapter.shortLabel}
                      </span>
                      <MetaDivider />
                      <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {chapterStats.total}문항
                      </span>
                      <MetaDivider />
                      <span className={`shrink-0 text-[11px] font-bold tabular-nums home-year-pct home-year-pct-${progressState}`}>
                        {progressRate}%
                      </span>
                    </div>
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleChapterSections(chapter.id)}
                      aria-expanded={sectionsOpen}
                      aria-label={`${chapter.shortLabel} 소분류 ${sectionsOpen ? '접기' : '펼치기'}`}
                      className={`shrink-0 mt-0.5 h-5 flex items-center rounded-md border px-1.5 text-[9px] font-bold leading-none shadow-sm transition-colors ${
                        sectionsOpen
                          ? `bg-white dark:bg-slate-900 ${style.border} ${style.text}`
                          : `bg-white/90 dark:bg-slate-900/70 ${style.border} ${style.text} hover:bg-white dark:bg-slate-900`
                      }`}
                    >
                      {sectionsOpen ? '접기' : '펼치기'}
                    </button>
                  )}
                </div>
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
                  className="w-full mt-2 text-left active:scale-[0.99] transition-transform disabled:opacity-50"
                  aria-label={`${chapter.shortLabel} 학습 시작`}
                >
                  <StudyProgressBar
                    progressRate={progressRate}
                    ariaLabel={`${chapter.shortLabel} 학습 진행률 ${progressRate}%`}
                    className=""
                  />
                </button>
                {sections.length > 1 && sectionsOpen && (
                  <ul className="mt-2 space-y-1 border-t border-white/60 dark:border-slate-600/40 pt-2">
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
                            className="w-full flex items-center gap-1.5 rounded-lg px-2 py-2 text-left hover:bg-white/60 dark:hover:bg-slate-700/40 active:scale-[0.98] transition-all disabled:opacity-40"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap min-h-[1.125rem]">
                              <span className={`min-w-0 text-[11px] font-medium ${style.text} leading-snug line-clamp-2`}>
                                {section.label}
                              </span>
                              <MetaDivider />
                              <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">
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
  wrongCount = 0,
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
    [progress],
  )

  const yearSpotLabel = dashboard.todaySpots.year
    ? formatTodayStudySpot(dashboard.todaySpots.year, exams, progress)
    : null
  const categorySpotLabel = dashboard.todaySpots.category
    ? formatTodayStudySpot(dashboard.todaySpots.category, exams, progress)
    : null

  const [studyView, setStudyView] = useState('year')
  const [expandedParts, setExpandedParts] = useState(() => new Set())
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

  return (
    <div className="home-screen-bg">
      <div className="home-header sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex-1 text-left touch-manipulation min-w-0"
            aria-label="맨 위로"
          >
            <BomGichulWordmark />
            <p className="home-brand-tagline text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {APP_TAGLINE}
            </p>
          </button>
          <div className="shrink-0 flex items-center gap-1.5">
            <WrongNoteShortcut count={wrongCount} onOpen={onOpenWrongNotes} />
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
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <section className="home-today-section p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">오늘의 학습</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                오늘 OX {dashboard.todayOx}문항
              </p>
            </div>
            <TodayStudyPanel
              title={STUDY_VIEWS[studyView].todayTitle}
              spot={studyView === 'year' ? dashboard.todaySpots.year : dashboard.todaySpots.category}
              spotLabel={studyView === 'year' ? yearSpotLabel : categorySpotLabel}
              onResume={onResumeTodayStudy}
            />
          </div>
        </section>

        <section className="space-y-2">
          <StudyViewSwitcher view={studyView} onChange={setStudyView} />

          {studyView === 'year' ? (
            <div className="grid grid-cols-2 gap-2">
              {activeYears.map(({ year, round, answered, total }) => (
                <YearStudyButton
                  key={year}
                  year={year}
                  round={round}
                  answered={answered}
                  total={total}
                  onClick={() => onStartStudyByYear(year)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {CURRICULUM.parts.map(part => (
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
          )}
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          총 {exams.length}문항 · {activeYears.length}개 연도 · {chapterCount}개 장
        </p>
      </div>
    </div>
  )
}
