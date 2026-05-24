import { useEffect, useMemo, useState } from 'react'

import AiLinkButtons from './AiLinkButtons'

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



function NoteCard({ note, onToggleNote, onToggleImportant, onOpenQuestion }) {
  const important = Boolean(note.important)

  return (
    <article
      className={`rounded-2xl p-4 space-y-3 border-2 transition-colors ${
        important
          ? 'bg-amber-50/60 border-amber-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-indigo-700">{formatExamRef(note)}</p>
            {important && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                중요
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-0.5">

            {note.category}

            {note.subcategory ? ` · ${note.subcategory}` : ''}

            {' · '}

            {formatStudyTime(note.savedAt)} 저장

          </p>

        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onToggleImportant && (
            <button
              type="button"
              onClick={() => onToggleImportant(note)}
              className={`w-7 h-7 rounded-md border text-sm leading-none transition-colors ${
                important
                  ? 'border-amber-400 bg-amber-100 text-amber-600'
                  : 'border-slate-200 bg-white text-slate-300 hover:text-amber-500 hover:border-amber-300'
              }`}
              title={important ? '중요 표시 해제' : '중요 표시'}
              aria-pressed={important}
            >
              {important ? '★' : '☆'}
            </button>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 px-1">
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



      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">

        <p className="text-[10px] font-semibold text-slate-400 mb-1">지문</p>

        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{note.stem}</p>

      </div>



      <div className="rounded-xl border border-slate-100 p-3">

        <div className="flex gap-3 items-start justify-between">

          <p className="flex-1 text-sm text-slate-800 leading-relaxed min-w-0">

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

          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-100">

            <p className="flex-1 text-xs text-slate-600 leading-relaxed min-w-0 whitespace-pre-wrap">

              {note.explanation}

            </p>

            <AiLinkButtons {...noteToAiContext(note)} />

          </div>

        ) : (

          <div className="flex items-start gap-2 mt-2">

            <p className="flex-1 text-xs text-slate-400 italic min-w-0">해설 없음</p>

            <AiLinkButtons {...noteToAiContext(note)} />

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

  const importantCount = useMemo(() => countImportantNotes(notes), [notes])

  const sorted = useMemo(
    () => listNotes(notes, { importantOnly: noteFilter === 'important' }),
    [notes, noteFilter]
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
  }, [pageSize, sorted.length, noteFilter])



  const changePageSize = (value) => {

    setPageSize(value)

    setPage(1)

  }



  return (

    <div className="min-h-screen bg-slate-50 pb-16">

      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">

        <div className="max-w-2xl mx-auto px-4 py-4">

          <h1 className="text-lg font-bold text-slate-800">암기노트</h1>

          <p className="text-xs text-slate-500 mt-0.5">
            학습 중 「암기노트저장」한 지문·보기·해설 ({Object.keys(notes).length}개
            {importantCount > 0 ? ` · 중요 ${importantCount}개` : ''})
          </p>

        </div>

      </div>



      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {Object.keys(notes).length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoteFilter('all')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  noteFilter === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setNoteFilter('important')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  noteFilter === 'important'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                }`}
              >
                ★ 중요만 ({importantCount})
              </button>
            </div>

            {sorted.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => changePageSize(opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        pageSize === opt.value
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {!isAll && sorted.length > pageSize && (
                  <p className="text-xs text-slate-500">
                    {rangeStart}–{rangeEnd} / {sorted.length}개 · {page} / {totalPages}페이지
                  </p>
                )}
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


