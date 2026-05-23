import { useMemo, useState } from 'react'
import {
  buildGlossaryIndex,
  formatExamRef,
  groupGlossaryByCategory,
} from '../data/glossaryIndex'

export default function IndexScreen({ exams, onOpenQuestion }) {
  const [query, setQuery] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(null)

  const glossary = useMemo(() => buildGlossaryIndex(exams), [exams])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return glossary
    const nq = q.replace(/\s+/g, '')
    return glossary.filter(
      entry =>
        entry.term.includes(q)
        || entry.term.replace(/\s+/g, '').includes(nq)
        || entry.category.includes(q)
    )
  }, [glossary, query])

  const grouped = useMemo(() => groupGlossaryByCategory(filtered), [filtered])

  const selectedEntry = useMemo(
    () => glossary.find(e => e.term === selectedTerm) ?? null,
    [glossary, selectedTerm]
  )

  const categoryNames = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'ko')),
    [grouped]
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-800">민법 용어집</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            윌비스 목차 기준 · 용어를 누르면 관련 기출 문항이 옆에 표시됩니다
          </p>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="용어 검색 (예: 의사표시, 저당권)"
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col md:flex-row md:overflow-hidden">
        <aside className="md:w-1/2 md:border-r md:border-slate-200 md:overflow-y-auto md:max-h-[calc(100vh-10rem)]">
          <div className="px-4 py-4 space-y-5">
            {categoryNames.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">검색 결과가 없습니다.</p>
            ) : (
              categoryNames.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grouped[cat].map(entry => {
                      const active = selectedTerm === entry.term
                      return (
                        <button
                          key={entry.term}
                          type="button"
                          onClick={() => setSelectedTerm(entry.term)}
                          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                            active
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {entry.term}
                          <span
                            className={`ml-1.5 text-xs ${
                              active ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {entry.exams.length}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="md:w-1/2 md:overflow-y-auto md:max-h-[calc(100vh-10rem)] border-t md:border-t-0 border-slate-200 bg-white md:bg-slate-50/50">
          <div className="px-4 py-5 min-h-[12rem] md:min-h-0">
            {!selectedEntry ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">📖</p>
                <p className="text-sm">왼쪽에서 용어를 선택하세요.</p>
                <p className="text-xs mt-2 text-slate-400">
                  모바일에서는 용어 선택 후 아래에 문항이 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedEntry.term}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedEntry.category}
                    {selectedEntry.section ? ` · ${selectedEntry.section}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    관련 기출 {selectedEntry.exams.length}문항
                  </p>
                </div>

                <ul className="space-y-2">
                  {selectedEntry.exams.map(exam => (
                    <li key={exam.id}>
                      <button
                        type="button"
                        onClick={() => onOpenQuestion(exam)}
                        className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-400 hover:shadow-sm transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-indigo-700 shrink-0">
                            {formatExamRef(exam)}
                          </span>
                          <span className="text-xs text-slate-400 truncate">
                            {exam.subcategory}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {exam.stem}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
