import { useMemo, useState } from 'react'
import taxonomy from '../../data/taxonomy.json'
import { CATEGORIES } from '../data/categoryStyles'
import { isExamComplete, isExamCorrect } from '../data/loadExam'

const subcategoryOrder = taxonomy.units.reduce((acc, unit) => {
  if (!acc[unit.category]) acc[unit.category] = []
  if (!acc[unit.category].includes(unit.subcategory)) acc[unit.category].push(unit.subcategory)
  return acc
}, {})

function examSubcategory(exam) {
  return exam.subcategory || '미분류'
}

export default function HomeScreen({
  exams,
  progress,
  onStartStudy,
  onStartStudyByYear,
  onStartAll,
  onViewWrongNotes,
  onResetProgress,
}) {
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [studyView, setStudyView] = useState('category')

  const studyViews = [
    { id: 'category', label: '카테고리별 학습' },
    { id: 'year', label: '기출연도별 학습' },
  ]
  const studyViewIndex = studyViews.findIndex(view => view.id === studyView)
  const currentStudyView = studyViews[studyViewIndex]

  const goPrevStudyView = () => {
    const nextIndex = (studyViewIndex - 1 + studyViews.length) % studyViews.length
    setStudyView(studyViews[nextIndex].id)
  }

  const goNextStudyView = () => {
    const nextIndex = (studyViewIndex + 1) % studyViews.length
    setStudyView(studyViews[nextIndex].id)
  }

  const totalAnswered = exams.filter(q => isExamComplete(progress, q.id)).length
  const totalCorrect = exams.filter(q => isExamCorrect(progress, q.id)).length
  const totalWrong = totalAnswered - totalCorrect
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

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

  const getCategoryStats = (catName) => getExamStats(exams.filter(q => q.category === catName))

  const subcategoriesByCategory = useMemo(() => {
    const found = new Map()
    for (const exam of exams) {
      const cat = exam.category
      const sub = examSubcategory(exam)
      if (!found.has(cat)) found.set(cat, new Set())
      found.get(cat).add(sub)
    }

    const result = {}
    for (const [cat, subs] of found) {
      const ordered = (subcategoryOrder[cat] ?? []).filter(name => subs.has(name))
      for (const name of subs) {
        if (!ordered.includes(name)) ordered.push(name)
      }
      result[cat] = ordered
    }
    return result
  }, [exams])

  const activeCategories = CATEGORIES.filter(c => getCategoryStats(c.name).total > 0)

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">공인중개사 민법</h1>
            <p className="text-xs text-slate-500">2016년 제27회 · 카테고리별 OX</p>
          </div>
          <button
            onClick={onResetProgress}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-300 text-sm">전체 진도</p>
              <p className="text-3xl font-bold mt-0.5">
                {totalAnswered}{' '}
                <span className="text-lg font-normal text-slate-400">/ {exams.length}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm">정답률</p>
              <p className="text-3xl font-bold mt-0.5 text-green-400">{overallRate}%</p>
            </div>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2 mb-4">
            <div
              className="bg-green-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${exams.length > 0 ? (totalAnswered / exams.length) * 100 : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={onStartAll}
              className="bg-white text-slate-800 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              전체 학습
            </button>
            <button
              onClick={onViewWrongNotes}
              className="bg-pink-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-pink-600 transition-colors flex items-center justify-center gap-1"
            >
              오답노트 <span className="bg-pink-400 text-white text-xs rounded-full px-1.5">{totalWrong}</span>
            </button>
            <div className="bg-slate-600 rounded-xl py-2.5 text-center">
              <p className="text-xs text-slate-300">정답</p>
              <p className="text-sm font-bold text-green-400">{totalCorrect}</p>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={goPrevStudyView}
              aria-label="이전 학습 방식"
              className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors"
            >
              ←
            </button>
            <div className="flex-1 text-center min-w-0">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide truncate">
                {currentStudyView.label}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {studyViewIndex + 1} / {studyViews.length}
              </p>
            </div>
            <button
              type="button"
              onClick={goNextStudyView}
              aria-label="다음 학습 방식"
              className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors"
            >
              →
            </button>
          </div>

          {studyView === 'category' ? (
            <>
              <p className="text-xs text-slate-400 mb-3">단원 탭 → 전체 학습 · ▶ 소분류 선택</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeCategories.map((cat) => {
                const stats = getCategoryStats(cat.name)
                const progressPct = stats.total > 0 ? (stats.answered / stats.total) * 100 : 0
                const subs = subcategoriesByCategory[cat.name] ?? []
                const expanded = expandedCategory === cat.name

                return (
                  <div
                    key={cat.name}
                    className={`${cat.light} ${cat.border} border rounded-2xl p-4 hover:shadow-md transition-all duration-150`}
                  >
                    <button
                      type="button"
                      onClick={() => onStartStudy({ category: cat.name, subcategory: null })}
                      className="w-full text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        {stats.answered > 0 && (
                          <span className={`text-xs font-bold ${cat.text} bg-white rounded-full px-2 py-0.5`}>
                            {stats.rate}%
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-bold ${cat.text} leading-tight mb-2`}>{cat.name}</p>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span>{stats.answered}/{stats.total}</span>
                        {stats.answered === stats.total && stats.total > 0 && (
                          <span className="text-green-500 font-semibold">완료 ✓</span>
                        )}
                      </div>
                      <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${cat.color} h-1.5 rounded-full transition-all duration-500`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </button>
                    {subs.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedCategory(expanded ? null : cat.name)}
                          className="mt-2 text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          {expanded ? '▼ 소분류 접기' : `▶ 소분류 ${subs.length}개`}
                        </button>
                        {expanded && (
                          <ul className="mt-2 space-y-1 border-t border-white/60 pt-2">
                            {subs.map(sub => {
                              const subStats = getExamStats(
                                exams.filter(q => q.category === cat.name && examSubcategory(q) === sub)
                              )
                              const subPct = subStats.total > 0 ? (subStats.answered / subStats.total) * 100 : 0
                              return (
                                <li key={sub}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onStartStudy({
                                        category: cat.name,
                                        subcategory: sub === '미분류' ? null : sub,
                                      })
                                    }
                                    className="w-full flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-white/60 active:scale-[0.98] transition-all"
                                  >
                                    <span className={`flex-1 text-[11px] font-medium ${cat.text} leading-tight truncate`}>
                                      {sub}
                                    </span>
                                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                                      {subStats.answered}/{subStats.total}
                                    </span>
                                    <div className="w-8 h-1 rounded-full bg-white overflow-hidden shrink-0">
                                      <div
                                        className={`${cat.color} h-full rounded-full`}
                                        style={{ width: `${subPct}%` }}
                                      />
                                    </div>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeYears.map(({ year, round, total, answered, rate }) => {
                const progressPct = total > 0 ? (answered / total) * 100 : 0
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => onStartStudyByYear(year)}
                    className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-left hover:shadow-md transition-all duration-150 active:scale-95 w-full"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">📅</span>
                      {answered > 0 && (
                        <span className="text-xs font-bold text-indigo-700 bg-white rounded-full px-2 py-0.5">
                          {rate}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-indigo-900 leading-tight mb-0.5">
                      {year}년
                    </p>
                    {round != null && (
                      <p className="text-xs text-indigo-600/80 mb-2">제{round}회</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>{answered}/{total}문항</span>
                      {answered === total && total > 0 && (
                        <span className="text-green-600 font-semibold">완료 ✓</span>
                      )}
                    </div>
                    <div className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          총 {exams.length}문항 · {activeYears.length}개 연도 · {activeCategories.length}개 카테고리
        </p>
      </div>
    </div>
  )
}
