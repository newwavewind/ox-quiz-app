import { useMemo, useState } from 'react'
import { buildExamStats, PART_META } from '../data/examStats'
import { findChapterForExam } from '../data/curriculum'

function DonutChart({ gradient, total, size = 'md' }) {
  const box = size === 'sm' ? 'w-28 h-28' : 'w-40 h-40'
  const inset = size === 'sm' ? 'inset-3.5' : 'inset-5'
  const totalText = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className={`relative ${box} shrink-0`} aria-hidden>
      <div className="w-full h-full rounded-full" style={{ background: gradient }} />
      <div className={`absolute ${inset} rounded-full bg-white flex flex-col items-center justify-center text-center`}>
        <span className={`${totalText} font-bold text-slate-800 leading-none`}>{total}</span>
        <span className="text-[9px] text-slate-400 leading-tight mt-0.5">총 문항</span>
      </div>
    </div>
  )
}

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export default function StatsScreen({ exams, onStartStudy, onBack }) {
  const stats = useMemo(() => buildExamStats(exams), [exams])
  const [expandedChapter, setExpandedChapter] = useState(null)

  const openChapter = chapterId => {
    onStartStudy?.({ chapterId, category: null, subcategory: null })
  }

  const openSubcategory = sub => {
    const sample = exams.find(e => e.category === sub.category && e.subcategory === sub.name)
    const chapter = sample ? findChapterForExam(sample) : null
    onStartStudy?.({
      chapterId: chapter?.id ?? null,
      category: sub.category,
      subcategory: sub.name,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-1 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800">기출 출제 통계</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">PART · CHAPTER별 출제 빈도 · 탭하여 학습</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <section className="card grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-400">총 문항</p>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">시험 연도</p>
            <p className="text-xl font-bold text-slate-800">{stats.examCount}회</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">연평균</p>
            <p className="text-xl font-bold text-slate-800">{stats.avgPerYear}문항</p>
          </div>
        </section>

        {stats.topCategory && (
          <p className="text-xs text-slate-500 text-center">
            가장 많이 출제된 단원:{' '}
            <span className="font-semibold text-slate-700">
              {stats.topCategory.icon} {stats.topCategory.name}
            </span>{' '}
            ({stats.topCategory.count}문항, {stats.topCategory.pct}%)
          </p>
        )}

        <section className="card">
          <h2 className="text-sm font-bold text-slate-800 mb-1">편별 출제 비율</h2>
          <p className="text-xs text-slate-400 mb-3">민법 편·민사특별법 기준</p>
          <div className="flex items-center gap-4">
            <ul className="flex-1 min-w-0 space-y-1.5">
              {stats.partRows.map(row => {
                const meta = row.meta ?? PART_META.part1
                return (
                  <li key={row.part} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <span className={`flex-1 min-w-0 font-medium leading-tight ${meta.text}`}>
                      {meta.label}
                    </span>
                    <span className="shrink-0 text-slate-600 tabular-nums whitespace-nowrap">
                      {row.count}문항 ({row.pct}%)
                    </span>
                  </li>
                )
              })}
            </ul>
            <DonutChart gradient={stats.donutGradient} total={stats.total} size="sm" />
          </div>
        </section>

        <section className="card">
          <h2 className="text-sm font-bold text-slate-800 mb-1">장별 출제</h2>
          <p className="text-xs text-slate-400 mb-4">막대·장 이름 탭 → 해당 장 학습 · ▶ 소분류</p>
          <ul className="space-y-3">
            {stats.chapterRows.map(row => {
              const subs = stats.subcategoryRows.filter(s => {
                const sample = exams.find(e => e.subcategory === s.name && e.category === s.category)
                const ch = sample ? findChapterForExam(sample) : null
                return ch?.id === row.id
              })
              const expanded = expandedChapter === row.id
              const maxCount = stats.chapterRows[0]?.count ?? 1

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openChapter(row.id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex-1 text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                        {row.name}
                      </span>
                      <span className="text-xs font-bold text-slate-600 tabular-nums">
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct(row.count, maxCount), 4)}%`,
                          backgroundColor: row.hex,
                        }}
                      />
                    </div>
                  </button>
                  {subs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedChapter(expanded ? null : row.id)}
                      className="mt-1 ml-2 text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      {expanded ? '▼ 소분류 접기' : '▶ 소분류 펼치기'}
                    </button>
                  )}
                  {expanded && subs.length > 0 && (
                    <ul className="mt-2 ml-2 space-y-1.5 border-l-2 border-slate-100 pl-3">
                      {subs.map(sub => (
                        <li key={sub.name}>
                          <button
                            type="button"
                            onClick={() => openSubcategory(sub)}
                            className="w-full flex items-center gap-2 text-xs text-left rounded-md py-0.5 -mx-1 px-1 hover:bg-slate-50 group/sub"
                          >
                            <span className="flex-1 text-slate-600 truncate group-hover/sub:text-slate-800">
                              {sub.name}
                            </span>
                            <span className="font-semibold text-slate-700 tabular-nums">{sub.count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-sm font-bold text-slate-800 mb-1">연도별 출제 히트맵</h2>
          <p className="text-xs text-slate-400 mb-3">진할수록 해당 연도에 많이 출제 · 위에서 아래로 장 순</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4 text-[11px] text-slate-600">
            {stats.chapterRows.map(cat => (
              <span key={cat.id} className="inline-flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.hex }}
                />
                {cat.name}
              </span>
            ))}
          </div>
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-8 py-2" aria-label="장" />
                {stats.yearMatrix.map(row => (
                  <th
                    key={row.year}
                    className="py-2 text-center text-slate-500 font-semibold tabular-nums"
                  >
                    {row.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.chapterRows.map(cat => (
                <tr key={cat.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-1 align-middle">
                    <span
                      className="block w-2.5 h-2.5 rounded-full mx-auto shrink-0"
                      style={{ backgroundColor: cat.hex }}
                      title={cat.name}
                    />
                  </td>
                  {stats.yearMatrix.map(row => {
                    const n = row.byChapter[cat.id] ?? 0
                    const intensity = n / stats.maxYearCell
                    return (
                      <td key={row.year} className="p-0.5 align-middle">
                        <div
                          className="rounded w-full max-w-[2.25rem] h-8 flex items-center justify-center tabular-nums font-medium mx-auto text-[11px]"
                          style={{
                            backgroundColor:
                              n === 0
                                ? '#f1f5f9'
                                : `color-mix(in srgb, ${cat.hex} ${Math.round(20 + intensity * 80)}%, white)`,
                            color: intensity > 0.5 ? '#fff' : '#475569',
                          }}
                          title={`${cat.name} · ${row.year}년: ${n}문항`}
                        >
                          {n || '·'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="text-sm font-bold text-slate-800 mb-3">소분류 TOP 10</h2>
          <ol className="space-y-2">
            {stats.subcategoryRows.slice(0, 10).map((sub, i) => {
              const max = stats.subcategoryRows[0]?.count ?? 1
              return (
                <li key={sub.name}>
                  <button
                    type="button"
                    onClick={() => openSubcategory(sub)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg py-1 px-1 -mx-1"
                  >
                    <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{sub.name}</p>
                      <p className="text-[10px] text-slate-400">{sub.category}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">{sub.count}</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-500"
                        style={{ width: `${Math.max(pct(sub.count, max), 8)}%` }}
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}
