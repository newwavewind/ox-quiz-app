import { useState, useEffect, useMemo, useRef } from 'react'
import AiLinkButtons from './AiLinkButtons'

const CHOICE_MARKERS = ['①', '②', '③', '④', '⑤']

export default function StudyMode({
  exams,
  progress,
  filter,
  allExams,
  onUpdateProgress,
  onBack,
  onFilterChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [revealedItems, setRevealedItems] = useState(() => new Set())
  const [graded, setGraded] = useState(false)
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

  useEffect(() => {
    setCurrentIndex(0)
    resetQuestionState()
  }, [filter, exams])

  const indexByQuestionNo = useMemo(() => {
    const map = new Map()
    exams.forEach((e, i) => map.set(e.question_no, i))
    return map
  }, [exams])

  const showQuestionJump = exams.length > 1

  const exam = exams[currentIndex]

  function resetQuestionState() {
    setUserAnswers({})
    setRevealedItems(new Set())
    setGraded(false)
  }

  const allAnswered = exam
    ? exam.items.every(item => userAnswers[item.key] != null)
    : false

  const handlePick = (key, choice) => {
    if (graded || revealedItems.has(key)) return
    setUserAnswers(prev => ({ ...prev, [key]: choice }))
  }

  const handleRevealItem = (key) => {
    if (graded || !userAnswers[key] || revealedItems.has(key)) return
    setRevealedItems(prev => new Set([...prev, key]))
  }

  const revealAllItems = () => {
    if (!exam) return
    setRevealedItems(new Set(exam.items.map(i => i.key)))
  }

  const handleGrade = () => {
    if (!exam || !allAnswered) return
    let correctCount = 0
    exam.items.forEach(item => {
      if (userAnswers[item.key] === item.answer) correctCount += 1
    })
    const allCorrect = correctCount === exam.items.length
    setGraded(true)
    revealAllItems()
    onUpdateProgress(exam.id, {
      answered: true,
      correct: allCorrect,
      score: correctCount,
      total: exam.items.length,
    })
    setSessionStats(prev => ({
      correct: prev.correct + (allCorrect ? 1 : 0),
      wrong: prev.wrong + (allCorrect ? 0 : 1),
    }))
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

  const isItemRevealed = (key) => graded || revealedItems.has(key)

  if (exams.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
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
  const prevRecord = progress[exam.id]
  const correctMark = exam.correct_choice
    ? CHOICE_MARKERS[exam.correct_choice - 1]
    : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar
        title={
          filter.examId && exams.length === 1
            ? `${exams[0].year}년 제${exams[0].round}회 · ${exams[0].question_no}번`
            : filter.category
              || (filter.year ? `${filter.year}년 학습` : null)
              || '전체 학습'
        }
        onBack={onBack}
        onFilter={() => setShowFilter(true)}
        sessionStats={sessionStats}
      />

      <div className="bg-white px-4 pb-3 border-b border-slate-100">
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

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-3 py-1 font-medium">
              {exam.category}
            </span>
            {exam.subcategory && (
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-3 py-1">
                {exam.subcategory}
              </span>
            )}
            <span className="text-xs text-slate-400 ml-auto">
              {exam.year}년 제{exam.round}회 · {exam.question_no}번
            </span>
            {prevRecord?.answered && !graded && (
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                prevRecord.correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {prevRecord.correct ? '이전 정답 ✓' : '이전 오답 ✗'}
              </span>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">지문</p>
            <p className="text-slate-800 leading-relaxed text-base font-medium whitespace-pre-wrap">
              {exam.stem}
            </p>
            {exam.question_type === 'composite' && exam.combo_choices?.length > 0 && (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                아래에서 ㄱ·ㄴ·ㄷ 등 각 보기 문장의 O/X를 고른 뒤, 맨 아래 기출 선택지와 대조하세요.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              보기별 O/X 선택 후 「정답 확인」으로 바로 채점·해설
            </p>
            {exam.items.map(item => {
              const picked = userAnswers[item.key]
              const revealed = isItemRevealed(item.key)
              const isRight = revealed && picked === item.answer
              const isWrong = revealed && picked != null && picked !== item.answer
              const canReveal = picked != null && !revealed && !graded
              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border-2 p-4 transition-colors ${
                    isRight
                      ? 'bg-green-50 border-green-300'
                      : isWrong
                        ? 'bg-red-50 border-red-300'
                        : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">
                      {item.label}
                    </span>
                    <p className="flex-1 text-slate-800 text-sm leading-relaxed min-w-0">
                      {item.text}
                    </p>
                    <div className="flex-none flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={revealed || graded}
                        onClick={() => handlePick(item.key, 'O')}
                        className={`ox-btn ox-btn-o ${picked === 'O' ? 'ox-btn-o-active' : ''}`}
                      >
                        O
                      </button>
                      <button
                        type="button"
                        disabled={revealed || graded}
                        onClick={() => handlePick(item.key, 'X')}
                        className={`ox-btn ox-btn-x ${picked === 'X' ? 'ox-btn-x-active' : ''}`}
                      >
                        X
                      </button>
                      <button
                        type="button"
                        disabled={!canReveal}
                        onClick={() => handleRevealItem(item.key)}
                        className="ox-btn-check"
                      >
                        정답 확인
                      </button>
                    </div>
                  </div>
                  {revealed && (
                    <div className="mt-3 ml-9 border-t border-slate-200/80 pt-2 space-y-1">
                      <p className="text-xs font-semibold">
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
                      </p>
                      {item.explanation ? (
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-xs text-slate-600 leading-relaxed min-w-0">
                            {item.explanation}
                          </p>
                          <AiLinkButtons exam={exam} item={item} userAnswer={picked} />
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-xs text-slate-400 italic min-w-0">해설 준비 중</p>
                          <AiLinkButtons exam={exam} item={item} userAnswer={picked} />
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
                      c.is_correct
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

          {!graded ? (
            <button
              onClick={handleGrade}
              disabled={!allAnswered}
              className="w-full bg-slate-800 text-white rounded-xl py-4 font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              {allAnswered ? '채점하기' : `보기 ${exam.items.length}개 모두 선택해 주세요`}
            </button>
          ) : (
            <div className={`rounded-2xl p-4 ${exam.items.every(i => userAnswers[i.key] === i.answer) ? 'bg-green-500' : 'bg-amber-500'}`}>
              <p className="text-white font-bold text-lg">
                {exam.items.every(i => userAnswers[i.key] === i.answer)
                  ? '모든 보기를 맞혔습니다!'
                  : `${exam.items.filter(i => userAnswers[i.key] === i.answer).length} / ${exam.items.length} 보기 정답`}
              </p>
              {correctMark && (
                <p className="text-white/90 text-sm mt-1">기출 정답: {correctMark}</p>
              )}
            </div>
          )}

          {graded && exam.explanation_summary && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">📖 해설 요약</p>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {exam.explanation_summary}
              </p>
            </div>
          )}

          {graded && (
            <div className="flex gap-3">
              {currentIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex-none bg-white border border-slate-200 text-slate-600 rounded-xl px-5 py-3.5 font-semibold text-sm"
                >
                  ← 이전
                </button>
              )}
              {currentIndex < exams.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 bg-slate-800 text-white rounded-xl py-3.5 font-semibold text-sm"
                >
                  다음 문제 →
                </button>
              ) : (
                <button
                  onClick={onBack}
                  className="flex-1 bg-green-600 text-white rounded-xl py-3.5 font-semibold text-sm"
                >
                  홈으로
                </button>
              )}
            </div>
          )}

          {!graded && (
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex-none text-slate-400 disabled:opacity-30 bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm"
              >
                ← 이전
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= exams.length - 1}
                className="flex-1 text-slate-500 disabled:opacity-30 bg-white border border-slate-200 rounded-xl py-3 text-sm"
              >
                건너뛰기 →
              </button>
            </div>
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

function FilterSheet({ filter, years, categories, onFilterChange, onClose }) {
  const [localFilter, setLocalFilter] = useState(filter)

  const handleApply = () => {
    onFilterChange(localFilter)
    onClose()
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
