import { useMemo } from 'react'
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-bottom-nav">
      <div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">공인중개사 민법</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">기출 OX · 연도별 · 목차별</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <section className="grid grid-cols-2 gap-2 items-start">
          <div className="min-w-0 flex flex-col gap-2">
            <p className="w-full py-2.5 px-2 rounded-xl text-sm font-semibold border text-center bg-slate-800 text-white border-slate-800">
              기출연도별 학습
            </p>
            <div className="flex flex-col gap-2">
              {activeYears.map(({ year, round }) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => onStartStudyByYear(year)}
                  className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-left hover:shadow-md transition-all duration-150 active:scale-[0.99]"
                >
                  <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                    <span className="text-sm font-bold text-indigo-900">{year}년</span>
                    {round != null && (
                      <span className="text-xs text-indigo-600/80">제{round}회</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex flex-col gap-2">
            <p className="w-full py-2.5 px-2 rounded-xl text-sm font-semibold border text-center bg-slate-800 text-white border-slate-800">
              목차별 학습
            </p>
            <div className="flex flex-col gap-2">
              {activeCategories.map((cat, catIndex) => {
                const subs = subcategoriesByCategory[cat.name] ?? []
                const orderNo = catIndex + 1

                return (
                  <div
                    key={cat.name}
                    className={`${cat.light} ${cat.border} border rounded-2xl p-3 hover:shadow-md transition-all duration-150`}
                  >
                    <button
                      type="button"
                      onClick={() => onStartStudy({ category: cat.name, subcategory: null })}
                      className="w-full text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold ${cat.text}`}>
                          {orderNo}
                        </span>
                        <p className={`flex-1 text-xs font-bold ${cat.text} leading-tight line-clamp-2`}>{cat.name}</p>
                      </div>
                    </button>
                    {subs.length > 0 && (
                      <ul className="mt-2 space-y-0.5 border-t border-white/60 pt-2">
                        {subs.map((sub, subIndex) => (
                          <li key={sub}>
                            <button
                              type="button"
                              onClick={() =>
                                onStartStudy({
                                  category: cat.name,
                                  subcategory: sub === '미분류' ? null : sub,
                                })
                              }
                              className="w-full flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-white/60 active:scale-[0.98] transition-all"
                            >
                              <span className="text-[10px] font-semibold text-slate-400 tabular-nums w-3.5 shrink-0">
                                {subIndex + 1}
                              </span>
                              <span className={`flex-1 text-[11px] font-medium ${cat.text} leading-tight line-clamp-2`}>
                                {sub}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          총 {exams.length}문항 · {activeYears.length}개 연도 · {activeCategories.length}개 카테고리
        </p>
      </div>
    </div>
  )
}
