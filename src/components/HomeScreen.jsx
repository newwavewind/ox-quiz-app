import { CATEGORIES } from '../data/categoryStyles'
import { isExamComplete, isExamCorrect } from '../data/loadExam'

export default function HomeScreen({
  exams,
  progress,
  onStartStudy,
  onStartStudyByYear,
  onStartAll,
  onViewWrongNotes,
  onResetProgress,
}) {
  const totalAnswered = exams.filter(q => isExamComplete(progress, q.id)).length
  const totalCorrect = exams.filter(q => isExamCorrect(progress, q.id)).length
  const totalWrong = totalAnswered - totalCorrect
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  const getCategoryStats = (catName) => {
    const catExams = exams.filter(q => q.category === catName)
    const answered = catExams.filter(q => isExamComplete(progress, q.id))
    const correct = catExams.filter(q => isExamCorrect(progress, q.id))
    const rate = answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0
    return {
      total: catExams.length,
      answered: answered.length,
      correct: correct.length,
      rate,
    }
  }

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
              className="bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
            >
              오답노트 <span className="bg-red-400 text-white text-xs rounded-full px-1.5">{totalWrong}</span>
            </button>
            <div className="bg-slate-600 rounded-xl py-2.5 text-center">
              <p className="text-xs text-slate-300">정답</p>
              <p className="text-sm font-bold text-green-400">{totalCorrect}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              카테고리별 학습
            </h2>
            <div className="grid grid-cols-2 gap-3">
            {activeCategories.map((cat) => {
              const stats = getCategoryStats(cat.name)
              const progressPct = stats.total > 0 ? (stats.answered / stats.total) * 100 : 0

              return (
                <button
                  key={cat.name}
                  onClick={() => onStartStudy(cat.name)}
                  className={`${cat.light} ${cat.border} border rounded-2xl p-4 text-left hover:shadow-md transition-all duration-150 active:scale-95`}
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
              )
            })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              기출연도별 학습
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
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
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          총 {exams.length}문항 · {activeYears.length}개 연도 · {activeCategories.length}개 카테고리
        </p>
      </div>
    </div>
  )
}
