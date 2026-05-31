import { useMemo, useRef, useState } from 'react'
import { CHOSUNG_NAV, getTermChosungKey } from '../utils/koreanChosung'
import AiLinkButtons from './AiLinkButtons'
import BomGichulWordmark from './BomGichulWordmark'
import GlossaryExamModal from './GlossaryExamModal'
import HighlightText from './HighlightText'
import { buildGlossaryTermAiPrompt } from '../utils/aiLinks'
import {
  buildGlossaryIndex,
  formatExamRef,
  getTermMatchInfo,
} from '../data/glossaryIndex'

export default function IndexScreen({ exams, savedNotes = {}, onToggleNote }) {
  const [query, setQuery] = useState('')
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [preview, setPreview] = useState(null)

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

  const selectedEntry = useMemo(
    () => glossary.find(e => e.term === selectedTerm) ?? null,
    [glossary, selectedTerm]
  )

  const termRefs = useRef({})

  const chosungFirstTerm = useMemo(() => {
    const map = {}
    for (const entry of filtered) {
      const key = getTermChosungKey(entry.term)
      if (key && map[key] === undefined) map[key] = entry.term
    }
    return map
  }, [filtered])

  const scrollToChosung = (chosung) => {
    const term = chosungFirstTerm[chosung]
    if (!term) return
    setSelectedTerm(term)
    requestAnimationFrame(() => {
      termRefs.current[term]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-bottom-nav">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <BomGichulWordmark suffix="용어집" />
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-row min-h-0 overflow-hidden max-h-[calc(100vh-10rem)]">
        <aside className="w-[38%] min-w-[7.5rem] max-w-[11rem] sm:max-w-none sm:w-2/5 shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
          <div className="px-2 sm:px-4 py-4 space-y-4">
            <div className="sticky top-0 z-10 -mx-0.5 px-0.5 pt-0 pb-2 space-y-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700">
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="용어 검색 (예: 의사표시, 저당권)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
              />
              {filtered.length > 0 && (
                <div
                  role="navigation"
                  aria-label="초성 바로가기"
                >
                  <div className="grid grid-cols-7 gap-0.5 sm:grid-cols-14 sm:gap-1">
                    {CHOSUNG_NAV.map(ch => {
                      const hasTerms = Boolean(chosungFirstTerm[ch])
                      return (
                        <button
                          key={ch}
                          type="button"
                          disabled={!hasTerms}
                          onClick={() => scrollToChosung(ch)}
                          className={`py-1 rounded text-[11px] sm:text-xs font-bold transition-colors ${
                            hasTerms
                              ? 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-800 hover:text-white hover:border-slate-800 dark:hover:bg-slate-600 dark:hover:border-slate-500'
                              : 'text-slate-300 dark:text-slate-600 bg-slate-100/80 dark:bg-slate-800/50 border border-transparent cursor-not-allowed'
                          }`}
                        >
                          {ch}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {filtered.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400 text-center py-8">검색 결과가 없습니다.</p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  {filtered.map((entry, idx) => {
                    const active = selectedTerm === entry.term
                    const chosung = getTermChosungKey(entry.term)
                    const prevChosung = idx > 0 ? getTermChosungKey(filtered[idx - 1].term) : null
                    const showHeading = chosung && chosung !== prevChosung
                    return (
                      <div key={entry.term}>
                        {showHeading && (
                          <p
                            id={`chosung-${chosung}`}
                            className="text-[10px] font-bold text-slate-400 px-1 pt-2 pb-0.5 first:pt-0"
                          >
                            {chosung}
                          </p>
                        )}
                        <button
                          ref={el => {
                            if (el) termRefs.current[entry.term] = el
                          }}
                          type="button"
                          onClick={() => setSelectedTerm(entry.term)}
                          className={`w-full text-left text-xs sm:text-sm px-2.5 sm:px-3 py-2 rounded-lg border transition-colors ${
                            active
                              ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-600 dark:border-slate-500'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-1.5 min-w-0">
                            <span className="font-medium truncate">{entry.term}</span>
                            <span
                              className={`shrink-0 text-[10px] tabular-nums ${
                                active ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              {entry.exams.length}
                            </span>
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-slate-900 md:bg-slate-50/50 md:dark:bg-slate-900/80">
          <div className="px-3 sm:px-5 py-4 min-h-0">
            {!selectedEntry ? (
              <div className="text-center py-10 sm:py-12 text-slate-400 px-2">
                <p className="text-3xl sm:text-4xl mb-3">📖</p>
                <p className="text-xs sm:text-sm">왼쪽에서 용어를 선택하면 오른쪽에 기출 문항이 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-800">{selectedEntry.term}</h2>
                    <AiLinkButtons
                      size="prominent"
                      prompt={buildGlossaryTermAiPrompt({
                        term: selectedEntry.term,
                        category: selectedEntry.category,
                        section: selectedEntry.section,
                      })}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedEntry.category}
                    {selectedEntry.section ? ` · ${selectedEntry.section}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    관련 기출 {selectedEntry.exams.length}문항 · 빨간색 = 용어 포함 위치
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    지문·보기에 없어도 소분류(단원명)에 있으면 목록에 포함됩니다.
                  </p>
                </div>

                <ul className="space-y-2">
                  {selectedEntry.exams.map(exam => {
                    const match = getTermMatchInfo(exam, selectedEntry.term)
                    return (
                    <li key={exam.id}>
                      <button
                        type="button"
                        onClick={() => setPreview({ exam, term: selectedEntry.term })}
                        className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-400 hover:shadow-sm transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-indigo-700 shrink-0">
                            {formatExamRef(exam)}
                          </span>
                          {exam.subcategory && (
                            <span className="text-xs text-slate-500 truncate min-w-0">
                              <HighlightText text={exam.subcategory} term={selectedEntry.term} />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          <HighlightText text={exam.stem} term={selectedEntry.term} />
                        </p>
                        {!match.inBody && match.inSubcategory && (
                          <p className="text-[10px] text-amber-700 mt-1.5">
                            소분류에만 포함 (지문·보기에는 「{selectedEntry.term}」 없음)
                          </p>
                        )}
                      </button>
                    </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>

      {preview && (
        <GlossaryExamModal
          exam={preview.exam}
          highlightTerm={preview.term}
          savedNotes={savedNotes}
          onToggleNote={onToggleNote}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
