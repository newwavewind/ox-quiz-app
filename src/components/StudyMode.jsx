import { useState, useEffect, useMemo, useRef } from 'react'
import AiLinkButtons from './AiLinkButtons'
import HighlightText from './HighlightText'
import { getTermMatchInfo } from '../data/glossaryIndex'
import { formatStudyTime, getItemAttempts } from '../data/studyHistory'
import { makeNoteId } from '../data/studyNotes'

const CHOICE_MARKERS = ['①', '②', '③', '④', '⑤']

function cleanExplanation(text) {
  if (!text) return ''
  return text
    .replace(/━+/g, '')
    .replace(/^[ \t]*[-─━=]{3,}[ \t]*$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export default function StudyMode({
  exams,
  startExamId = null,
  progress,
  filter,
  allExams,
  onUpdateProgress,
  onLogItemAttempt,
  onClearItemAttempts,
  onRemoveItemAttempt,
  savedNotes = {},
  onToggleNote,
  onBack,
  onFilterChange,
  onRegenerateRandom,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [revealedItems, setRevealedItems] = useState(() => new Set())
  const [questionRevealed, setQuestionRevealed] = useState(false)
  const [historyOpenKey, setHistoryOpenKey] = useState(null)
  const [collapsedItemKeys, setCollapsedItemKeys] = useState(() => new Set())
  const [showFilter, setShowFilter] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })

  const years = useMemo(
    () => [...new Set(allExams.map(q => q.year))].sort((a, b) => b - a),
    [allExams]
  )

  const categories = useMemo(
    () => [...new Set(allExams.map(q => q.category))],
    [allExams]
  )

  const examListKey = useMemo(() => exams.map(e => e.id).join('|'), [exams])

  useEffect(() => {
    let startIdx = 0
    if (startExamId) {
      const idx = exams.findIndex(e => e.id === startExamId)
      if (idx >= 0) startIdx = idx
    }
    setCurrentIndex(startIdx)
    resetQuestionState()
    // exams 참조는 progress 갱신마다 바뀌므로 의존성에서 제외 (OX 확인 직후 상태가 초기화되는 버그 방지)
  }, [filter, examListKey, startExamId])

  const indexByQuestionNo = useMemo(() => {
    const map = new Map()
    exams.forEach((e, i) => map.set(e.question_no, i))
    return map
  }, [exams])

  const showQuestionJump = exams.length > 1
  const isRandom40 = filter.mode === 'random40'

  const exam = exams[currentIndex]

  function resetQuestionState() {
    setUserAnswers({})
    setRevealedItems(new Set())
    setQuestionRevealed(false)
    setHistoryOpenKey(null)
    setCollapsedItemKeys(new Set())
  }

  const toggleItemDetail = (key) => {
    setCollapsedItemKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePick = (key, choice) => {
    if (questionRevealed || revealedItems.has(key)) return
    setUserAnswers(prev => ({ ...prev, [key]: choice }))
  }

  const handleRevealItem = (key) => {
    if (questionRevealed || !userAnswers[key] || revealedItems.has(key)) return
    const item = exam?.items.find(i => i.key === key)
    if (item && onLogItemAttempt) {
      onLogItemAttempt(exam.id, key, {
        pick: userAnswers[key],
        correct: userAnswers[key] === item.answer,
      })
    }
    setRevealedItems(prev => new Set([...prev, key]))
    setCollapsedItemKeys(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const handleRevealQuestion = () => {
    if (!exam || questionRevealed) return
    setQuestionRevealed(true)
  }

  const handleHideQuestionAnswer = () => {
    setQuestionRevealed(false)
    setRevealedItems(new Set())
    setCollapsedItemKeys(new Set())
  }

  const handleNext = () => {
    if (currentIndex < exams.length - 1) {
      setCurrentIndex(i => i + 1)
      resetQuestionState()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      resetQuestionState()
    }
  }

  const jumpToQuestion = (questionNo) => {
    const idx = indexByQuestionNo.get(questionNo)
    if (idx == null || idx === currentIndex) return
    setCurrentIndex(idx)
    resetQuestionState()
  }

  if (exams.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-bottom-nav">
        <TopBar title="학습 모드" onBack={onBack} onFilter={() => setShowFilter(true)} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">해당 문제가 없습니다</h2>
          <button onClick={() => setShowFilter(true)} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold">
            필터 변경
          </button>
        </div>
        {showFilter && (
          <FilterSheet
            filter={filter}
            years={years}
            categories={categories}
            onFilterChange={onFilterChange}
            onClose={() => setShowFilter(false)}
          />
        )}
      </div>
    )
  }

  const progressPct = ((currentIndex + 1) / exams.length) * 100
  const correctMark = exam.correct_choice
    ? CHOICE_MARKERS[exam.correct_choice - 1]
    : null
  const highlightTerm = filter.highlightTerm
  const termMatch = highlightTerm ? getTermMatchInfo(exam, highlightTerm) : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-bottom-nav">
      <TopBar
        title={
          isRandom40
            ? '랜덤 40문제'
            : filter.subcategory
              ? `${filter.category} · ${filter.subcategory}`
              : filter.category
                || (filter.year && exams[0]?.round != null
                  ? `${filter.year}년 제${exams[0].round}회`
                  : filter.year
                    ? `${filter.year}년 학습`
                    : null)
                || '전체 학습'
        }
        onBack={onBack}
        onFilter={() => setShowFilter(true)}
        sessionStats={sessionStats}
      />

      <div className="bg-white px-4 pb-3 border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{currentIndex + 1} / {exams.length}문항</span>
          <span className="text-green-600 font-medium">
            {sessionStats.correct > 0 || sessionStats.wrong > 0
              ? `이번 세션 ${sessionStats.correct}정 ${sessionStats.wrong}오`
              : ''}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-slate-700 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {showQuestionJump && (
            <QuestionJumpBar
              exams={exams}
              currentQuestionNo={exam.question_no}
              progress={progress}
              onJump={jumpToQuestion}
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              이전
            </button>
            <button
              type="button"
              onClick={currentIndex >= exams.length - 1 ? onBack : handleNext}
              className={`flex-1 rounded-xl py-2.5 font-semibold text-sm ${
                currentIndex >= exams.length - 1
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {currentIndex >= exams.length - 1 ? '홈으로' : '다음'}
            </button>
          </div>

          <div className="flex w-full items-center gap-2 min-w-0">
            <div
              className={`flex items-center gap-2 min-w-0 flex-1 ${
                isRandom40 ? 'flex-nowrap overflow-x-auto overscroll-x-contain py-0.5' : 'flex-wrap'
              }`}
            >
              <span className="shrink-0 text-xs bg-slate-200 text-slate-600 rounded-full px-3 py-1 font-medium">
                {exam.category}
              </span>
              {exam.subcategory && (
                <span className="shrink-0 text-xs bg-slate-100 text-slate-500 rounded-full px-3 py-1">
                  {highlightTerm ? (
                    <HighlightText text={exam.subcategory} term={highlightTerm} />
                  ) : (
                    exam.subcategory
                  )}
                </span>
              )}
              {isRandom40 && (
                <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap ml-3 sm:ml-5">
                  출제 빈도(소분류) 반영 · {exams.length}문항 랜덤 세트
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs text-slate-400 ml-auto pl-1">
              {exam.year}년 제{exam.round}회
            </span>
          </div>

          {highlightTerm && termMatch && (
            <p className="text-xs text-red-600 font-medium leading-relaxed">
              {termMatch.inBody && termMatch.inSubcategory && (
                <>용어집 「{highlightTerm}」: 소분류·지문·보기 중 빨간색 표시</>
              )}
              {termMatch.inBody && !termMatch.inSubcategory && (
                <>용어집 「{highlightTerm}」 포함 부분을 빨간색으로 표시합니다</>
              )}
              {!termMatch.inBody && termMatch.inSubcategory && (
                <>
                  「{highlightTerm}」은 지문·보기에는 없고, 위 <strong>소분류</strong>에 포함되어 연결된
                  문항입니다.
                </>
              )}
            </p>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">지문</p>
            <p className="text-slate-800 leading-relaxed text-base font-medium whitespace-pre-wrap">
              <span className="font-bold text-slate-800 mr-1">{exam.question_no}.</span>
              <HighlightText text={exam.stem} term={highlightTerm} />
            </p>
            {exam.question_type === 'composite' && exam.combo_choices?.length > 0 && (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                아래에서 ㄱ·ㄴ·ㄷ 등 각 보기 문장의 O/X를 고른 뒤, 맨 아래 기출 선택지와 대조하세요.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {exam.items.map(item => {
              const picked = userAnswers[item.key]
              const oxChecked = revealedItems.has(item.key)
              const showOxFeedback = oxChecked && !questionRevealed
              const showAnswerKey = questionRevealed || oxChecked
              const isRight = showOxFeedback && picked === item.answer
              const isWrong = showOxFeedback && picked != null && picked !== item.answer
              const canReveal = picked != null && !oxChecked && !questionRevealed
              const controlsLocked = oxChecked || questionRevealed
              const pickPending = picked != null && !oxChecked && !questionRevealed
              const showOHighlight =
                (pickPending && picked === 'O')
                || (showOxFeedback && picked === 'O')
                || (questionRevealed && item.answer === 'O')
              const showXHighlight =
                (pickPending && picked === 'X')
                || (showOxFeedback && picked === 'X')
                || (questionRevealed && item.answer === 'X')
              const itemExplanation = cleanExplanation(item.explanation)
              const itemAttempts = getItemAttempts(progress, exam.id, item.key)
              const historyOpen = historyOpenKey === item.key
              const noteSaved = Boolean(savedNotes[makeNoteId(exam.id, item.key)])
              const hasHistory = itemAttempts.length > 0
              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border-2 p-4 transition-colors ${
                    isRight
                      ? 'bg-white border-green-300'
                      : isWrong
                        ? 'bg-white border-red-300'
                        : questionRevealed
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-start">
                    <div className="flex gap-2 min-w-0 flex-1">
                      <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">
                        {item.label}
                      </span>
                      <p className="flex-1 text-slate-800 text-sm leading-relaxed min-w-0">
                        <HighlightText text={item.text} term={highlightTerm} />
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pl-8 sm:pl-0 sm:flex-none sm:shrink-0 sm:justify-end">
                      <button
                        type="button"
                        disabled={controlsLocked}
                        onClick={() => handlePick(item.key, 'O')}
                        className={`ox-btn ox-btn-o ${showOHighlight ? 'ox-btn-o-active' : ''}`}
                      >
                        O
                      </button>
                      <button
                        type="button"
                        disabled={controlsLocked}
                        onClick={() => handlePick(item.key, 'X')}
                        className={`ox-btn ox-btn-x ${showXHighlight ? 'ox-btn-x-active' : ''}`}
                      >
                        X
                      </button>
                      <button
                        type="button"
                        disabled={!canReveal}
                        onClick={() => handleRevealItem(item.key)}
                        className="ox-btn-check"
                      >
                        OX 확인
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryOpenKey(historyOpen ? null : item.key)}
                        className={`h-8 min-w-[2.25rem] px-1.5 rounded-md text-[10px] font-bold border transition-colors ${
                          historyOpen
                            ? 'border-slate-700 bg-slate-700 text-white'
                            : hasHistory
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                        title="학습 기록"
                      >
                        {hasHistory ? `${itemAttempts.length}회` : '기록'}
                      </button>
                    </div>
                  </div>
                  {historyOpen && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-slate-700 shrink-0">학습 기록</p>
                        {itemAttempts.length > 0 && onClearItemAttempts && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('이 보기의 학습 기록을 모두 삭제할까요?')) {
                                onClearItemAttempts(exam.id, item.key)
                              }
                            }}
                            className="text-[11px] font-semibold text-red-500 hover:text-red-700 shrink-0"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                      {itemAttempts.length === 0 ? (
                        <p className="text-xs text-slate-400">OX 확인을 하면 기록됩니다.</p>
                      ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                          {[...itemAttempts].reverse().map(attempt => (
                            <li
                              key={attempt.at}
                              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 text-xs border-b border-slate-200/80 pb-2 last:border-0 last:pb-0"
                            >
                              <span className="min-w-0 text-slate-600 truncate text-left">
                                {formatStudyTime(attempt.at)}
                              </span>
                              <span
                                className={`shrink-0 font-medium whitespace-nowrap ${
                                  attempt.correct ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {attempt.pick} · {attempt.correct ? '정답' : '오답'}
                              </span>
                              {onRemoveItemAttempt && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveItemAttempt(exam.id, item.key, attempt.at)}
                                  className="shrink-0 text-[11px] font-semibold text-slate-400 hover:text-red-600 px-1 whitespace-nowrap"
                                  aria-label={`${formatStudyTime(attempt.at)} 기록 삭제`}
                                >
                                  삭제
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {showAnswerKey && (
                    <div className="mt-3 pl-8 sm:pl-0 sm:ml-9 border-t border-slate-200/80 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleItemDetail(item.key)}
                        className="w-full flex items-start gap-2 text-left hover:opacity-80"
                        aria-expanded={!collapsedItemKeys.has(item.key)}
                      >
                        <p className="flex-1 text-xs font-semibold min-w-0">
                          {showOxFeedback ? (
                            <>
                              {isRight ? (
                                <span className="text-green-600">✓ 맞았습니다</span>
                              ) : (
                                <span className="text-red-600">✗ 틀렸습니다</span>
                              )}
                              <span className={`ml-2 ${item.answer === 'O' ? 'text-blue-600' : 'text-red-600'}`}>
                                정답 {item.answer}
                              </span>
                              {picked && (
                                <span className="text-slate-400 font-normal ml-1">· 내 답 {picked}</span>
                              )}
                            </>
                          ) : (
                            <span className={item.answer === 'O' ? 'text-blue-600' : 'text-red-600'}>
                              정답 {item.answer}
                            </span>
                          )}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400 pt-0.5">
                          {collapsedItemKeys.has(item.key) ? '펼치기 ▼' : '접기 ▲'}
                        </span>
                      </button>
                      {!collapsedItemKeys.has(item.key) && (
                        <div className="space-y-1 mt-1">
                          {itemExplanation ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                              <p className="flex-1 text-xs text-slate-600 leading-relaxed min-w-0">
                                <HighlightText text={itemExplanation} term={highlightTerm} />
                              </p>
                              <AiLinkButtons
                                exam={exam}
                                item={item}
                                userAnswer={picked}
                                className="w-full items-start sm:w-auto sm:items-end"
                                buttonRowClassName="justify-start sm:justify-end"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
                              <p className="flex-1 text-xs text-slate-400 italic min-w-0">해설 준비 중</p>
                              <AiLinkButtons
                                exam={exam}
                                item={item}
                                userAnswer={picked}
                                className="w-full items-start sm:w-auto sm:items-end"
                                buttonRowClassName="justify-start sm:justify-end"
                              />
                            </div>
                          )}
                          {onToggleNote && (
                            <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={noteSaved}
                                onChange={() => onToggleNote(exam, item)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-400 w-4 h-4"
                              />
                              <span className={`text-xs font-semibold ${noteSaved ? 'text-amber-700' : 'text-slate-600'}`}>
                                암기노트저장
                              </span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {exam.combo_choices?.length > 0 && (
            <div className="bg-slate-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">정답 조합 (기출 선택지)</p>
              <div className="flex flex-wrap gap-2">
                {exam.combo_choices.map(c => (
                  <span
                    key={c.no}
                    className={`text-sm px-3 py-1.5 rounded-lg border ${
                      questionRevealed && c.is_correct
                        ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {c.label} {c.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!questionRevealed ? (
            <button
              onClick={handleRevealQuestion}
              className="w-full bg-slate-800 text-white rounded-xl py-4 font-bold text-base hover:bg-slate-700"
            >
              정답 확인
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHideQuestionAnswer}
              className="w-full flex items-center gap-2 p-4 text-left rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors"
              aria-expanded
            >
              <p className="flex-1 font-semibold text-slate-800 min-w-0">
                {correctMark ? `기출 정답 ${correctMark}` : '기출 정답'}
              </p>
              <span className="shrink-0 text-xs text-slate-400">접기 ▲</span>
            </button>
          )}

        </div>
      </div>

      {showFilter && (
        <FilterSheet
          filter={filter}
          years={years}
          categories={categories}
          onFilterChange={onFilterChange}
          onClose={() => setShowFilter(false)}
          onRegenerateRandom={onRegenerateRandom}
        />
      )}
    </div>
  )
}

function QuestionJumpBar({ exams, currentQuestionNo, progress, onJump }) {
  const [open, setOpen] = useState(false)
  const currentBtnRef = useRef(null)
  const yearLabel =
    new Set(exams.map(e => e.year)).size === 1 ? `${exams[0].year}년 ` : ''

  const answeredCount = exams.filter(e => progress[e.id]?.answered).length

  useEffect(() => {
    if (!open || !currentBtnRef.current) return
    currentBtnRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [open, currentQuestionNo])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 transition-colors"
        aria-expanded="false"
      >
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
          {yearLabel}문항
        </span>
        <span className="text-[11px] text-slate-400 truncate flex-1">
          {currentQuestionNo}번 · {answeredCount}/{exams.length} 풀이
        </span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
          {yearLabel}바로가기
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 px-1"
        >
          접기
        </button>
      </div>
      <div
        className="flex gap-0.5 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 snap-x snap-mandatory"
        role="list"
      >
        {exams.map(e => {
          const isCurrent = e.question_no === currentQuestionNo
          const rec = progress[e.id]
          let statusClass = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          if (rec?.answered) {
            statusClass = rec.correct
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }
          if (isCurrent) {
            statusClass = 'bg-slate-800 text-white border-slate-800'
          }
          return (
            <button
              key={e.id}
              type="button"
              role="listitem"
              onClick={() => {
                onJump(e.question_no)
              }}
              ref={isCurrent ? currentBtnRef : undefined}
              aria-label={`${e.question_no}번으로 이동`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`snap-center shrink-0 h-7 min-w-[1.75rem] rounded-md border text-[11px] font-semibold transition-colors ${statusClass}`}
            >
              {e.question_no}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TopBar({ title, onBack, onFilter, sessionStats }) {
  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 font-bold text-slate-800 truncate text-sm">{title}</h1>
        <button
          onClick={onFilter}
          className="text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 font-medium hover:bg-slate-200"
        >
          필터
        </button>
      </div>
    </div>
  )
}

function FilterSheet({ filter, years, categories, onFilterChange, onClose, onRegenerateRandom }) {
  const [localFilter, setLocalFilter] = useState(filter)
  const isRandom40 = filter.mode === 'random40'

  const handleApply = () => {
    onFilterChange(localFilter)
    onClose()
  }

  if (isRandom40) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">랜덤 세트</h2>
            <button type="button" onClick={onClose} className="text-slate-400">✕</button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
            출제 빈도(소분류)를 반영해 40문항을 뽑았습니다. 다시 뽑으면 다른 조합이 나옵니다.
          </p>
          {onRegenerateRandom && (
            <button
              type="button"
              onClick={() => {
                onRegenerateRandom()
                onClose()
              }}
              className="w-full bg-violet-600 text-white rounded-xl py-4 font-bold hover:bg-violet-700 mb-2"
            >
              다시 뽑기
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-3 font-semibold"
          >
            닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">필터</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">문제 상태</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: '전체' },
              { value: 'unanswered', label: '미풀이' },
              { value: 'wrong', label: '오답만' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLocalFilter(f => ({ ...f, status: opt.value }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  localFilter.status === opt.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">정렬</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'number', label: '문항번호순' },
              { value: 'category', label: '카테고리순' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLocalFilter(f => ({ ...f, sort: opt.value }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  (localFilter.sort || 'number') === opt.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">연도</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocalFilter(f => ({ ...f, year: null }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                !localFilter.year ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              전체
            </button>
            {years.map(y => (
              <button
                key={y}
                onClick={() => setLocalFilter(f => ({ ...f, year: y }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  localFilter.year === y ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">카테고리</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLocalFilter(f => ({ ...f, category: null }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                !localFilter.category ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              전체
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setLocalFilter(f => ({ ...f, category: cat }))}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  localFilter.category === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleApply} className="w-full bg-slate-800 text-white rounded-xl py-4 font-bold">
          적용하기
        </button>
      </div>
    </div>
  )
}
