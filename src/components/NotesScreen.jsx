import { useEffect, useMemo, useRef, useState } from 'react'

import AiLinkButtons from './AiLinkButtons'

import { getSubcategoryDisplayLabel } from '../data/curriculum'
import {
  countImportantNotes,
  formatExamRef,
  formatStudyTime,
  listNotes,
  noteToAiContext,
} from '../data/studyNotes'



const PAGE_SIZE_OPTIONS = [

  { value: 5, label: '5개씩' },

  { value: 10, label: '10개씩' },

  { value: 30, label: '30개씩' },

  { value: 50, label: '50개씩' },

  { value: 'all', label: '전체 보기' },

]

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'oldest', label: '과거순' },
]

function noteFilterTabClass(active, kind) {
  if (!active) {
    return 'font-medium text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
  }
  if (kind === 'important') {
    return 'font-bold text-slate-900 dark:text-slate-100 border-amber-500'
  }
  return 'font-bold text-slate-900 dark:text-slate-100 border-indigo-500'
}

function NoteSelectChip({ value, options, onChange, ariaLabel, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find(opt => String(opt.value) === String(value)) ?? options[0]

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] font-medium transition-colors ${
          open
            ? 'text-slate-700 dark:text-slate-200'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
      >
        <span className="whitespace-nowrap">{selected.label}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`w-2.5 h-2.5 shrink-0 opacity-45 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-full mt-1.5 z-20 min-w-[8.75rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map(opt => {
            const active = String(opt.value) === String(value)
            return (
              <li key={String(opt.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'text-indigo-700 bg-indigo-50/80 dark:text-indigo-200 dark:bg-indigo-950/40'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active ? (
                    <span className="text-indigo-500 dark:text-indigo-300 text-[10px]" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}



function NoteCard({ note, onToggleNote, onToggleImportant, onOpenQuestion }) {
  const important = Boolean(note.important)

  return (
    <article
      className={`rounded-2xl p-4 space-y-3 border-2 transition-colors ${
        important
          ? 'bg-amber-50/60 border-amber-300 dark:bg-slate-800 dark:border-amber-500/60'
          : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatExamRef(note)}</p>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              · {formatStudyTime(note.savedAt)} 저장
            </span>
            {important && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-slate-700 border border-amber-200 dark:border-amber-500/50 rounded px-1.5 py-0.5">
                중요
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-0.5">
            {note.category}
            {note.subcategory
              ? ` · ${getSubcategoryDisplayLabel(note.category, note.subcategory)}`
              : ''}
          </p>

        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onToggleImportant && (
            <button
              type="button"
              onClick={() => onToggleImportant(note)}
              className={`w-7 h-7 rounded-md border text-sm leading-none transition-colors ${
                important
                  ? 'border-amber-400 bg-amber-100 text-amber-600 dark:border-amber-500/60 dark:bg-slate-700 dark:text-amber-400'
                  : 'border-slate-200 bg-white text-slate-300 hover:text-amber-500 hover:border-amber-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500 dark:hover:text-amber-400 dark:hover:border-amber-600'
              }`}
              title={important ? '중요 표시 해제' : '중요 표시'}
              aria-pressed={important}
            >
              {important ? '★' : '☆'}
            </button>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 px-1">
            <input
              type="checkbox"
              checked
              onChange={() => onToggleNote(note)}
              className="rounded border-slate-300 text-slate-800 focus:ring-slate-400"
            />
            저장됨
          </label>
        </div>
      </div>



      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-3">

        <p className="text-[10px] font-semibold text-slate-400 mb-1">지문</p>

        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{note.stem}</p>

      </div>



      <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3">

        <div className="flex gap-3 items-start justify-between">

          <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 leading-relaxed min-w-0">

            <span className="font-bold text-slate-500 mr-1">{note.itemLabel}</span>

            {note.itemText}

          </p>

          {note.answer && (

            <span

              className={`text-xs font-semibold shrink-0 ${

                note.answer === 'O' ? 'text-blue-600' : 'text-red-600'

              }`}

            >

              정답 {note.answer}

            </span>

          )}

        </div>

        {note.explanation ? (

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2 mt-2 pt-2 border-t border-slate-100">

            <p className="flex-1 text-xs text-slate-600 leading-relaxed min-w-0 whitespace-pre-wrap">

              {note.explanation}

            </p>

            <AiLinkButtons
              {...noteToAiContext(note)}
              className="w-full items-start sm:w-auto sm:items-end"
              buttonRowClassName="justify-start sm:justify-end"
            />

          </div>

        ) : (

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2 mt-2">

            <p className="flex-1 text-xs text-slate-400 italic min-w-0">해설 없음</p>

            <AiLinkButtons
              {...noteToAiContext(note)}
              className="w-full items-start sm:w-auto sm:items-end"
              buttonRowClassName="justify-start sm:justify-end"
            />

          </div>

        )}

      </div>



      {onOpenQuestion && (

        <button

          type="button"

          onClick={() => onOpenQuestion(note.examId)}

          className="w-full text-center text-xs font-semibold text-slate-600 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"

        >

          이 문항으로 이동

        </button>

      )}

    </article>

  )

}



export default function NotesScreen({ notes, onToggleNote, onToggleImportant, onOpenQuestion }) {
  const [noteFilter, setNoteFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('recent')

  const importantCount = useMemo(() => countImportantNotes(notes), [notes])

  const sorted = useMemo(
    () => listNotes(notes, { importantOnly: noteFilter === 'important', sort: sortOrder }),
    [notes, noteFilter, sortOrder]
  )

  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)



  const isAll = pageSize === 'all'

  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize))



  const visibleNotes = useMemo(() => {

    if (isAll) return sorted

    const start = (page - 1) * pageSize

    return sorted.slice(start, start + pageSize)

  }, [sorted, page, pageSize, isAll])



  const rangeStart = sorted.length === 0 ? 0 : isAll ? 1 : (page - 1) * pageSize + 1

  const rangeEnd = isAll ? sorted.length : Math.min(page * pageSize, sorted.length)



  useEffect(() => {

    if (page > totalPages) setPage(totalPages)

  }, [page, totalPages])



  useEffect(() => {
    setPage(1)
  }, [pageSize, sorted.length, noteFilter, sortOrder])



  const changePageSize = (value) => {

    setPageSize(value)

    setPage(1)

  }



  return (

    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-bottom-nav">

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">

        <div className="max-w-2xl mx-auto px-4 py-4">

          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">암기노트</h1>

          <p className="text-xs text-slate-500 mt-0.5">
            학습 중 「암기노트저장」한 지문·보기·해설 ({Object.keys(notes).length}개
            {importantCount > 0 ? ` · 중요 ${importantCount}개` : ''})
          </p>

        </div>

      </div>



      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {Object.keys(notes).length > 0 && (
          <div className="space-y-2">
            <div className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setNoteFilter('all')}
                  className={`flex-1 pb-2.5 pt-1 text-xs transition-colors border-b-2 -mb-px ${noteFilterTabClass(noteFilter === 'all', 'all')}`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setNoteFilter('important')}
                  className={`flex-1 pb-2.5 pt-1 text-xs transition-colors border-b-2 -mb-px ${noteFilterTabClass(noteFilter === 'important', 'important')}`}
                >
                  ★ 중요만 ({importantCount})
                </button>
              </div>
            </div>

            {sorted.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {!isAll && sorted.length > pageSize
                      ? `${rangeStart}–${rangeEnd} / ${sorted.length}개 · ${page}/${totalPages}`
                      : `${sorted.length}개`}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 rounded-lg border border-slate-200/70 dark:border-slate-600/45 px-2 py-1">
                    <NoteSelectChip
                      value={pageSize}
                      options={PAGE_SIZE_OPTIONS}
                      onChange={changePageSize}
                      ariaLabel="페이지당 표시 개수"
                    />
                    <span className="text-slate-300 dark:text-slate-600 text-[10px]" aria-hidden>
                      ·
                    </span>
                    <NoteSelectChip
                      value={sortOrder}
                      options={SORT_OPTIONS}
                      onChange={setSortOrder}
                      ariaLabel="정렬 순서"
                      align="right"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {sorted.length === 0 ? (

          <div className="text-center py-16 text-slate-400">

            <p className="text-4xl mb-3">📝</p>

            <p className="text-sm">
              {noteFilter === 'important' && Object.keys(notes).length > 0
                ? '중요 표시한 암기노트가 없습니다.'
                : '저장된 암기노트가 없습니다.'}
            </p>
            <p className="text-xs mt-2">
              {noteFilter === 'important'
                ? '암기노트의 ☆ 버튼으로 중요 표시를 추가하세요.'
                : '학습 화면에서 OX 확인 후 「암기노트저장」을 체크하세요.'}
            </p>

          </div>

        ) : (

          <>

            {visibleNotes.map(note => (

              <NoteCard

                key={note.id}

                note={note}

                onToggleNote={onToggleNote}
                onToggleImportant={onToggleImportant}
                onOpenQuestion={onOpenQuestion}

              />

            ))}



            {!isAll && totalPages > 1 && (

              <div className="flex items-center justify-center gap-2 pt-2">

                <button

                  type="button"

                  disabled={page <= 1}

                  onClick={() => setPage(p => p - 1)}

                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"

                >

                  이전

                </button>

                <span className="text-xs text-slate-500 tabular-nums min-w-[4rem] text-center">

                  {page} / {totalPages}

                </span>

                <button

                  type="button"

                  disabled={page >= totalPages}

                  onClick={() => setPage(p => p + 1)}

                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"

                >

                  다음

                </button>

              </div>

            )}

          </>

        )}

      </div>

    </div>

  )

}


