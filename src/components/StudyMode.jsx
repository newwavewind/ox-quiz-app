import { useState, useEffect, useMemo, useRef } from 'react'
import AiLinkButtons from './AiLinkButtons'
import HighlightText from './HighlightText'
import { getTermMatchInfo } from '../data/glossaryIndex'
import { formatStudyTime, getItemAttempts, countExamStudyRoundAttempts } from '../data/studyHistory'
import { makeNoteId } from '../data/studyNotes'
import {
  evaluatePastExamScore,
  gradePastExamQuestion,
  itemKeyToChoiceNo,
  summarizePastExamResults,
} from '../data/pastExamGrade'
import { getRandomExamCount, isRandomStudyMode } from '../data/randomExamSet'
import { gradeOxStudyQuestion, isExamComplete, isExamCorrect } from '../data/loadExam'
import { getChapterShortLabel } from '../data/curriculum'
import { clearStudyResume, loadStudyResume, saveStudyResume } from '../data/studyResume'
import { saveTodayStudySpot } from '../data/todayStudySpot'
import { registerScrollToTop } from '../utils/scrollToTop'
import AuthBar from './AuthBar'
import PastExamQuestionBlock from './PastExamQuestionBlock'
import PastExamScrollArrows from './PastExamScrollArrows'
import PastExamTenRoundBar from './PastExamTenRoundBar'
import StudySessionSummary from './StudySessionSummary'
import { PastExamScoreSheet, QuestionNumberPrefix } from './StudyModeShared'
import {
  loadPastExamRounds,
  savePastExamRoundResult,
  isValidPastExamRound,
  isPastExamInfiniteRound,
  isPastExamPlayableRound,
  formatPastExamRoundLabel,
  getPastExamRoundBlockMessage,
  getPastExamInfiniteBlockMessage,
} from '../data/pastExamRounds'

const CHOICE_MARKERS = ['①', '②', '③', '④', '⑤']

const EXAM_WRONG_NOTE_PAGE_SIZE_OPTIONS = [
  { value: 5, label: '5개씩' },
  { value: 10, label: '10개씩' },
  { value: 20, label: '20개씩' },
  { value: 'all', label: '전체 보기' },
]

function StudyConfirmModal({ message, confirmLabel, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-xl border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-labelledby="study-confirm-title"
      >
        <p
          id="study-confirm-title"
          className="text-base font-bold text-center text-slate-800 dark:text-slate-100"
        >
          {message}
        </p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  onExitPastExamRetry,
  onFilterChange,
  onRegenerateRandom,
  onReviewPastExamRound,
  isPastExamRetry = false,
  pastExamRetryRound = null,
  pastExamRetryKind = null,
  onRetryWrongOnly,
  exitLabel = '홈으로',
  studyVisible = true,
  resumeStorageKey = 'default',
  appearance = null,
  onAppearanceChange,
  onOpenRound5Cert,
  isInExamWrongNotes,
  onToggleExamWrongNote,
  examWrongNotes = {},
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [revealedItems, setRevealedItems] = useState(() => new Set())
  const [questionRevealed, setQuestionRevealed] = useState(false)
  const [historyOpenKey, setHistoryOpenKey] = useState(null)
  const [collapsedItemKeys, setCollapsedItemKeys] = useState(() => new Set())
  const [showFilter, setShowFilter] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [sessionLog, setSessionLog] = useState([])
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [pastExamFinalChoice, setPastExamFinalChoice] = useState(null)
  const [pastExamResults, setPastExamResults] = useState({})
  const [showPastExamScore, setShowPastExamScore] = useState(false)
  const [pastExamDrafts, setPastExamDrafts] = useState({})
  const [pastExamAllRevealed, setPastExamAllRevealed] = useState(false)
  const [pastExamRound, setPastExamRound] = useState(null)
  const [pastExamScoreRoundNo, setPastExamScoreRoundNo] = useState(null)
  const [pastExamRoundsData, setPastExamRoundsData] = useState({})
  const [pastExamRoundHint, setPastExamRoundHint] = useState(null)
  const [historyConfirm, setHistoryConfirm] = useState(null)
  const [examWrongNotePageSize, setExamWrongNotePageSize] = useState(10)
  const [examWrongNotePage, setExamWrongNotePage] = useState(1)
  const [examWrongNoteSort, setExamWrongNoteSort] = useState('recent')
  const scrollContainerRef = useRef(null)
  const studyScrollRef = useRef(null)
  const sectionRefs = useRef([])
  const pastExamEndRef = useRef(null)
  const pastExamHapticIndexRef = useRef(null)
  const scrollStudyToTopRef = useRef(() => {})
  /** @type {React.MutableRefObject<Map<string, boolean>>} */
  const sessionAttemptRef = useRef(new Map())

  const getStudyScrollTop = () =>
    scrollContainerRef.current?.scrollTop ?? studyScrollRef.current?.scrollTop ?? 0

  const restoreStudyScroll = (scrollTop, index) => {
    requestAnimationFrame(() => {
      const root = scrollContainerRef.current ?? studyScrollRef.current
      if (scrollTop > 0 && root) {
        root.scrollTo({ top: scrollTop, behavior: 'auto' })
        return
      }
      sectionRefs.current[index]?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }

  const isRandomExam = isRandomStudyMode(filter)
  const randomExamCount = isRandomExam ? getRandomExamCount(filter) : null
  const isPastExamYear = filter.mode === 'pastExam'
  const isExamWrongNotes = filter.mode === 'examWrongNotes'
  const usePastExamSolveUI = isPastExamYear || isRandomExam || isExamWrongNotes
  const isPastExam = isPastExamYear

  const examWrongNotesSortedExams = useMemo(() => {
    if (!isExamWrongNotes) return exams
    return [...exams].sort((a, b) => {
      const ta = examWrongNotes?.[a.id]?.addedAt ?? 0
      const tb = examWrongNotes?.[b.id]?.addedAt ?? 0
      return examWrongNoteSort === 'oldest' ? ta - tb : tb - ta
    })
  }, [isExamWrongNotes, exams, examWrongNotes, examWrongNoteSort])

  const examWrongNotePageMeta = useMemo(() => {
    if (!isExamWrongNotes) return null
    const total = examWrongNotesSortedExams.length
    const isAll = examWrongNotePageSize === 'all'
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / examWrongNotePageSize))
    const page = Math.min(examWrongNotePage, totalPages)
    const start = isAll ? 0 : (page - 1) * examWrongNotePageSize
    const end = isAll ? total : Math.min(start + examWrongNotePageSize, total)
    return {
      total,
      isAll,
      totalPages,
      page,
      visible: examWrongNotesSortedExams.slice(start, end),
      rangeStart: total === 0 ? 0 : isAll ? 1 : start + 1,
      rangeEnd: end,
    }
  }, [isExamWrongNotes, examWrongNotesSortedExams, examWrongNotePageSize, examWrongNotePage])

  const pastExamSolveExams =
    isExamWrongNotes && examWrongNotePageMeta ? examWrongNotePageMeta.visible : exams

  const years = useMemo(
    () => [...new Set(allExams.map(q => q.year))].sort((a, b) => b - a),
    [allExams]
  )

  const categories = useMemo(
    () => [...new Set(allExams.map(q => q.category))],
    [allExams]
  )

  const examListKey = useMemo(() => exams.map(e => e.id).join('|'), [exams])

  const studyFilterKey = useMemo(
    () =>
      [
        filter.mode,
        filter.chapterId,
        filter.category,
        filter.subcategory,
        filter.year,
        filter.status,
        filter.sort,
        filter.randomCount,
        filter.highlightTerm,
      ].join('\0'),
    [
      filter.mode,
      filter.chapterId,
      filter.category,
      filter.subcategory,
      filter.year,
      filter.status,
      filter.sort,
      filter.randomCount,
      filter.highlightTerm,
    ],
  )

  const studyInitKeyRef = useRef(null)

  useEffect(() => {
    const initKey = `${resumeStorageKey}|${examListKey}|${studyFilterKey}|${startExamId ?? ''}`
    if (studyInitKeyRef.current === initKey) return
    studyInitKeyRef.current = initKey

    const saved = loadStudyResume(resumeStorageKey, examListKey)
    const isResume = saved != null && saved.currentIndex >= 0
    const useResume = isResume && !startExamId

    let startIdx = 0
    if (startExamId) {
      const idx = exams.findIndex(e => e.id === startExamId)
      if (idx >= 0) {
        startIdx = idx
        clearStudyResume(resumeStorageKey)
      }
    } else if (isResume) {
      startIdx = Math.min(saved.currentIndex, Math.max(0, exams.length - 1))
    }
    setCurrentIndex(startIdx)

    if (usePastExamSolveUI) {
      if (!useResume && !isPastExamRetry) {
        setPastExamDrafts({})
        setPastExamAllRevealed(false)
        setPastExamResults({})
        setShowPastExamScore(false)
        setPastExamScoreRoundNo(null)
      }
      if (isPastExamYear) {
        setPastExamRound(
          isPastExamRetry && isValidPastExamRound(pastExamRetryRound) ? pastExamRetryRound : null
        )
        setPastExamRoundsData(loadPastExamRounds(filter.year))
      } else if (!useResume) {
        setPastExamRound(null)
        setPastExamRoundsData({})
      }
      sectionRefs.current = []
      if (useResume) {
        restoreStudyScroll(saved.scrollTop ?? 0, startIdx)
      }
    } else if (!useResume) {
      resetQuestionState()
    }
    // exams 참조는 progress 갱신마다 바뀌므로 의존성에서 제외 (OX 확인 직후 상태가 초기화되는 버그 방지)
    sessionAttemptRef.current = new Map()
    setSessionLog([])
    setSessionStats({ correct: 0, wrong: 0 })
  }, [
    resumeStorageKey,
    examListKey,
    studyFilterKey,
    startExamId,
    usePastExamSolveUI,
    isPastExamYear,
    isPastExamRetry,
    pastExamRetryRound,
    filter.year,
  ])

  useEffect(() => {
    if (!isPastExamRetry || !isPastExamYear || !isValidPastExamRound(pastExamRetryRound)) return
    const rec = pastExamRoundsData[pastExamRetryRound]
    if (!rec?.results) return
    const filteredResults = {}
    const drafts = {}
    for (const e of exams) {
      const r = rec.results[e.id]
      if (r) {
        filteredResults[e.id] = r
        drafts[e.id] = { userAnswers: {}, finalChoice: r.finalChoice ?? null }
      }
    }
    setPastExamResults(filteredResults)
    setPastExamDrafts(drafts)
    setPastExamAllRevealed(true)
  }, [isPastExamRetry, isPastExamYear, pastExamRetryRound, examListKey, pastExamRoundsData, exams])

  useEffect(() => {
    if (!examListKey || exams.length === 0) return
    saveStudyResume({
      storageKey: resumeStorageKey,
      examListKey,
      currentIndex,
      scrollTop: getStudyScrollTop(),
    })
  }, [resumeStorageKey, examListKey, currentIndex])

  useEffect(() => {
    if (usePastExamSolveUI || exams.length === 0) return
    const currentExam = exams[currentIndex]
    if (!currentExam) return
    saveTodayStudySpot({
      filter,
      exam: currentExam,
      position: currentIndex + 1,
      total: exams.length,
    })
  }, [
    usePastExamSolveUI,
    examListKey,
    currentIndex,
    exams.length,
    filter.year,
    filter.chapterId,
    filter.category,
    filter.subcategory,
    filter.mode,
  ])

  useEffect(() => {
    if (studyVisible || !examListKey) return
    saveStudyResume({
      storageKey: resumeStorageKey,
      examListKey,
      currentIndex,
      scrollTop: getStudyScrollTop(),
    })
  }, [studyVisible, resumeStorageKey, examListKey, currentIndex])

  useEffect(() => {
    if (!studyVisible || !examListKey) return undefined
    const saved = loadStudyResume(resumeStorageKey, examListKey)
    if (saved) restoreStudyScroll(saved.scrollTop ?? 0, currentIndex)
    return undefined
  }, [studyVisible, resumeStorageKey, examListKey])

  useEffect(() => {
    const inSolve =
      isRandomExam || (isPastExamYear && (isPastExamRetry || pastExamRound != null))
    if (!inSolve) return undefined
    const root = scrollContainerRef.current
    if (!root) return undefined

    let scrollEndTimer

    const syncIndexAfterScroll = () => {
      const rootTop = root.getBoundingClientRect().top
      let bestIdx = 0
      let bestDist = Infinity
      sectionRefs.current.forEach((el, i) => {
        if (!el) return
        const dist = Math.abs(el.getBoundingClientRect().top - rootTop)
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = i
        }
      })
      pastExamHapticIndexRef.current = bestIdx
      setCurrentIndex(prev => (prev === bestIdx ? prev : bestIdx))
    }

    const onScroll = () => {
      window.clearTimeout(scrollEndTimer)
      scrollEndTimer = window.setTimeout(syncIndexAfterScroll, 150)
    }

    const onScrollEnd = () => syncIndexAfterScroll()

    root.addEventListener('scroll', onScroll, { passive: true })
    if ('onscrollend' in window) {
      root.addEventListener('scrollend', onScrollEnd)
    }
    return () => {
      root.removeEventListener('scroll', onScroll)
      if ('onscrollend' in window) {
        root.removeEventListener('scrollend', onScrollEnd)
      }
      window.clearTimeout(scrollEndTimer)
    }
  }, [
    isRandomExam,
    isPastExamYear,
    examListKey,
    pastExamRound,
    isPastExamRetry,
  ])

  useEffect(() => {
    pastExamHapticIndexRef.current = null
  }, [examListKey])

  useEffect(() => {
    const inSolve =
      isRandomExam || (isPastExamYear && (isPastExamRetry || pastExamRound != null))
    if (!inSolve) return undefined
    const id = requestAnimationFrame(() => {
      const root = scrollContainerRef.current
      const el = sectionRefs.current[currentIndex]
      if (root && el) {
        const top = scrollOffsetInContainer(root, el)
        root.scrollTo({ top, behavior: 'auto' })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [examListKey, isRandomExam, isPastExamYear, pastExamRound, isPastExamRetry])

  useEffect(() => {
    if (!pastExamRoundHint) return undefined
    const t = window.setTimeout(() => setPastExamRoundHint(null), 2800)
    return () => window.clearTimeout(t)
  }, [pastExamRoundHint])

  useEffect(() => {
    if (!isExamWrongNotes) return
    setExamWrongNotePage(1)
  }, [examWrongNoteSort, examWrongNotePageSize, isExamWrongNotes])

  useEffect(() => {
    if (!isExamWrongNotes || !examWrongNotePageMeta) return
    if (examWrongNotePage > examWrongNotePageMeta.totalPages) {
      setExamWrongNotePage(examWrongNotePageMeta.totalPages)
    }
  }, [isExamWrongNotes, examWrongNotePage, examWrongNotePageMeta?.totalPages])

  useEffect(() => {
    if (!isExamWrongNotes) return
    setPastExamDrafts({})
    setPastExamAllRevealed(false)
    setPastExamResults({})
    setShowPastExamScore(false)
  }, [isExamWrongNotes, examWrongNoteSort, examWrongNotePageSize, examWrongNotePage])

  useEffect(() => {
    if (!isExamWrongNotes || !studyVisible) return
    scrollStudyToTopRef.current?.()
  }, [examWrongNotePage, examWrongNoteSort, examWrongNotePageSize, isExamWrongNotes, studyVisible])

  const showRoundInJumpBar = useMemo(() => {
    const years = new Set(exams.map(e => e.year))
    const rounds = new Set(exams.map(e => e.round))
    return years.size > 1 || rounds.size > 1
  }, [exams])

  const showQuestionJump = exams.length > 1
  const pastExamSummary = useMemo(
    () => (usePastExamSolveUI ? summarizePastExamResults(pastExamSolveExams, pastExamResults) : null),
    [usePastExamSolveUI, pastExamSolveExams, pastExamResults]
  )

  const exam = exams[currentIndex]
  const isPastExamComposite = isPastExam && exam?.question_type === 'composite'
  const isPastExamPickOne =
    isPastExam && (exam?.question_type === 'wrong' || exam?.question_type === 'correct')
  const currentPastResult = exam ? pastExamResults[exam.id] : null

  function resetQuestionState() {
    setUserAnswers({})
    setRevealedItems(new Set())
    setQuestionRevealed(false)
    setHistoryOpenKey(null)
    setCollapsedItemKeys(new Set())
    setPastExamFinalChoice(null)
  }

  const computeExamRoundCount = (targetExam, pendingItemKey = null) => {
    if (!targetExam?.items?.length) return 0
    return targetExam.items.reduce((min, item) => {
      let n = getItemAttempts(progress, targetExam.id, item.key).length
      if (pendingItemKey === item.key) n += 1
      return Math.min(min, n)
    }, Infinity)
  }

  const recordOxExamProgress = (targetExam, answers, roundCount) => {
    if (!targetExam || isPastExam || usePastExamSolveUI || !onUpdateProgress) return
    const result = gradeOxStudyQuestion(targetExam, answers)
    const prevCorrect = sessionAttemptRef.current.get(targetExam.id)
    const isRetry = prevCorrect !== undefined

    onUpdateProgress(targetExam.id, {
      ...result,
      attempts: roundCount ?? computeExamRoundCount(targetExam),
    })
    sessionAttemptRef.current.set(targetExam.id, result.correct)

    setSessionLog(prev => {
      const idx = prev.findIndex(e => e.examId === targetExam.id)
      const entry = {
        examId: targetExam.id,
        questionNo: targetExam.question_no,
        correct: result.correct,
      }
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      return [...prev, entry]
    })

    setSessionStats(prev => {
      if (!isRetry) {
        return {
          correct: prev.correct + (result.correct ? 1 : 0),
          wrong: prev.wrong + (result.correct ? 0 : 1),
        }
      }
      return {
        correct: prev.correct - (prevCorrect ? 1 : 0) + (result.correct ? 1 : 0),
        wrong: prev.wrong - (prevCorrect ? 0 : 1) + (result.correct ? 0 : 1),
      }
    })
  }

  const maybeRecordWhenAllItemsRevealed = (targetExam, nextRevealed, answers, justRevealedKey) => {
    if (!targetExam || isPastExam || usePastExamSolveUI) return
    const allRevealed = targetExam.items.every(item => nextRevealed.has(item.key))
    const allPicked = targetExam.items.every(item => answers[item.key] != null)
    if (allRevealed && allPicked) {
      recordOxExamProgress(
        targetExam,
        answers,
        computeExamRoundCount(targetExam, justRevealedKey),
      )
    }
  }

  const requestExit = () => {
    if (!usePastExamSolveUI && sessionLog.length > 0) {
      setShowSessionSummary(true)
      return
    }
    onBack()
  }

  const confirmSessionExit = () => {
    setShowSessionSummary(false)
    onBack()
  }

  const sessionSummary = useMemo(() => {
    const wrongNumbers = sessionLog.filter(e => !e.correct).map(e => e.questionNo)
    return {
      total: sessionLog.length,
      correct: sessionLog.filter(e => e.correct).length,
      wrong: sessionLog.filter(e => !e.correct).length,
      wrongNumbers,
      wrongExamIds: sessionLog.filter(e => !e.correct).map(e => e.examId),
    }
  }, [sessionLog])

  const toggleItemDetail = (key) => {
    setCollapsedItemKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePick = (key, choice) => {
    if (questionRevealed || isPastExam) return
    if (revealedItems.has(key)) return
    setUserAnswers(prev => ({ ...prev, [key]: choice }))
  }

  const handlePastExamFinalPick = (no) => {
    if (questionRevealed || no == null) return
    setPastExamFinalChoice(no)
  }

  const handleRevealItem = (key) => {
    if (questionRevealed || revealedItems.has(key)) return
    if (!isPastExam && !userAnswers[key]) return
    if (!isPastExam) {
      const item = exam?.items.find(i => i.key === key)
      if (item && onLogItemAttempt) {
        onLogItemAttempt(exam.id, key, {
          pick: userAnswers[key],
          correct: userAnswers[key] === item.answer,
        })
      }
    }
    setRevealedItems(prev => {
      const next = new Set([...prev, key])
      maybeRecordWhenAllItemsRevealed(exam, next, { ...userAnswers, [key]: userAnswers[key] }, key)
      return next
    })
    setCollapsedItemKeys(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const logUnrevealedItemAttempts = (targetExam, answers, revealed) => {
    if (!targetExam || !onLogItemAttempt) return
    for (const item of targetExam.items) {
      const pick = answers[item.key]
      if (pick == null || revealed.has(item.key)) continue
      onLogItemAttempt(targetExam.id, item.key, {
        pick,
        correct: pick === item.answer,
      })
    }
  }

  const handleRevealQuestion = () => {
    if (!exam || questionRevealed) return
    if (isPastExam) {
      setQuestionRevealed(true)
      setCollapsedItemKeys(new Set())
      setPastExamResults(prev => ({
        ...prev,
        [exam.id]: gradePastExamQuestion(exam, userAnswers, pastExamFinalChoice),
      }))
      return
    }
    logUnrevealedItemAttempts(exam, userAnswers, revealedItems)
    setQuestionRevealed(true)
  }

  const handleHideQuestionAnswer = () => {
    setQuestionRevealed(false)
    setRevealedItems(new Set())
    setCollapsedItemKeys(new Set())
    if (isPastExam && exam) {
      setPastExamFinalChoice(null)
      setUserAnswers({})
      setPastExamResults(prev => {
        const next = { ...prev }
        delete next[exam.id]
        return next
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < exams.length - 1) {
      setCurrentIndex(i => i + 1)
      resetQuestionState()
      return
    }
    if (isPastExam && pastExamSummary?.allGraded) {
      setShowPastExamScore(true)
      return
    }
    requestExit()
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      resetQuestionState()
    }
  }

  const scrollOffsetInContainer = (root, el) => {
    if (!root || !el) return 0
    return root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top
  }

  const isPastExamScrollContainerActive = root =>
    Boolean(root && root.scrollHeight > root.clientHeight + 2)

  const scrollPastExamToTarget = (el, behavior = 'auto') => {
    if (!el) return
    const root = scrollContainerRef.current
    if (!root || !isPastExamScrollContainerActive(root)) {
      el.scrollIntoView({ behavior, block: 'start' })
      return
    }

    const scrollTop = Math.max(
      0,
      Math.min(scrollOffsetInContainer(root, el), root.scrollHeight - root.clientHeight)
    )
    root.scrollTo({ top: scrollTop, behavior })
    root.scrollTop = scrollTop
  }

  const scrollPastExamContainerTo = (top, snapTarget = null) => {
    const root = scrollContainerRef.current
    if (!root) return false
    if (snapTarget) {
      scrollPastExamToTarget(snapTarget, 'auto')
      return true
    }

    const scrollTop = Math.max(0, Math.min(top, root.scrollHeight - root.clientHeight))
    if (!isPastExamScrollContainerActive(root)) return false
    root.scrollTo({ top: scrollTop, behavior: 'auto' })
    root.scrollTop = scrollTop
    return true
  }

  const scrollPastExamSection = idx => {
    if (idx < 0 || idx >= exams.length) return
    const root = scrollContainerRef.current
    const el = sectionRefs.current[idx]
    if (!root || !el) return
    setCurrentIndex(idx)
    pastExamHapticIndexRef.current = idx
    scrollPastExamContainerTo(0, el)
  }

  const goPastExamTop = () => {
    if (exams.length === 0) return
    setCurrentIndex(0)
    pastExamHapticIndexRef.current = 0
    const root = scrollContainerRef.current
    if (root) {
      root.scrollTo({ top: 0, behavior: 'auto' })
      root.scrollTop = 0
      return
    }
    const el = sectionRefs.current[0]
    if (el) scrollPastExamToTarget(el, 'auto')
  }

  const goPastExamBottom = () => {
    const root = scrollContainerRef.current
    if (!root || exams.length === 0) return
    const lastIdx = exams.length - 1
    const endEl = pastExamEndRef.current ?? sectionRefs.current[lastIdx]
    setCurrentIndex(lastIdx)
    pastExamHapticIndexRef.current = lastIdx
    if (endEl) {
      scrollPastExamToTarget(endEl, 'auto')
    } else {
      scrollPastExamContainerTo(root.scrollHeight)
    }
  }

  const scrollStudyToTop = () => {
    const inSolve =
      isRandomExam || (isPastExamYear && (isPastExamRetry || pastExamRound != null))
    if (inSolve && exams.length > 0) {
      goPastExamTop()
      return
    }
    const root = scrollContainerRef.current ?? studyScrollRef.current
    if (root && root.scrollHeight > root.clientHeight + 2) {
      root.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  scrollStudyToTopRef.current = scrollStudyToTop

  useEffect(() => {
    if (!studyVisible) return undefined
    return registerScrollToTop(() => scrollStudyToTopRef.current())
  }, [studyVisible])

  const jumpToExam = (examId) => {
    const idx = exams.findIndex(e => e.id === examId)
    if (idx < 0) return
    setCurrentIndex(idx)
    if (usePastExamSolveUI && pastExamHapticIndexRef.current !== idx) {
      pastExamHapticIndexRef.current = idx
    }
    if (usePastExamSolveUI) {
      scrollPastExamSection(idx)
      return
    }
    if (isPastExam) {
      sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (idx === currentIndex) return
    resetQuestionState()
  }

  const setPastExamDraftFinal = (examId, no) => {
    if (isPastExamRetry || no == null) return
    if (isExamWrongNotes ? pastExamResults[examId] : pastExamAllRevealed) return
    setPastExamDrafts(prev => ({
      ...prev,
      [examId]: {
        userAnswers: {},
        ...(prev[examId] ?? {}),
        finalChoice: no,
      },
    }))
  }

  const handleRevealSinglePastExam = examId => {
    if (!isExamWrongNotes || pastExamResults[examId]) return
    const target = pastExamSolveExams.find(e => e.id === examId)
    if (!target) return
    const draft = pastExamDrafts[examId] ?? { userAnswers: {}, finalChoice: null }
    setPastExamResults(prev => ({
      ...prev,
      [examId]: gradePastExamQuestion(target, draft.userAnswers, draft.finalChoice),
    }))
  }

  const handleRevealAllPastExam = () => {
    if (pastExamAllRevealed || isPastExamRetry) return
    const graded = {}
    pastExamSolveExams.forEach(e => {
      const draft = pastExamDrafts[e.id] ?? { userAnswers: {}, finalChoice: null }
      graded[e.id] = gradePastExamQuestion(e, draft.userAnswers, draft.finalChoice)
    })

    if (isRandomExam) {
      setPastExamResults(graded)
      setPastExamAllRevealed(true)
      setPastExamScoreRoundNo(null)
      setShowPastExamScore(true)
      return
    }

    const roundToSave = pastExamRound
    if (!isPastExamPlayableRound(roundToSave)) return

    const yearExams = allExams.filter(e => e.year === parseInt(filter.year, 10))
    const resultsToSave = graded

    setPastExamResults(resultsToSave)
    setPastExamAllRevealed(true)
    const summary = summarizePastExamResults(yearExams, resultsToSave)
    const scoreEval = evaluatePastExamScore(summary.questionCorrect, summary.questionTotal)
    const rounds = savePastExamRoundResult(filter.year, roundToSave, {
      questionCorrect: summary.questionCorrect,
      questionTotal: summary.questionTotal,
      results: resultsToSave,
      score: scoreEval.score,
      passed: scoreEval.passed,
      hasGwakjak: scoreEval.hasGwakjak,
    })
    setPastExamRoundsData(rounds)
    setPastExamScoreRoundNo(roundToSave)
    setShowPastExamScore(true)
  }

  const startPastExamRound = roundNo => {
    if (isPastExamInfiniteRound(roundNo)) {
      const blockMsg = getPastExamInfiniteBlockMessage(pastExamRoundsData)
      if (blockMsg) {
        setPastExamRoundHint(blockMsg)
        return
      }
    } else {
      if (!isValidPastExamRound(roundNo)) return
      const existing = pastExamRoundsData[roundNo]
      if (existing?.completed) return
      const blockMsg = getPastExamRoundBlockMessage(roundNo, pastExamRoundsData)
      if (blockMsg) {
        setPastExamRoundHint(blockMsg)
        return
      }
    }
    setPastExamRound(roundNo)
    setPastExamDrafts({})
    setPastExamResults({})
    setPastExamAllRevealed(false)
    setShowPastExamScore(false)
    setCurrentIndex(0)
    sectionRefs.current = []
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    })
  }

  const viewPastExamRoundResult = roundNo => {
    const rec = pastExamRoundsData[roundNo]
    if (!rec?.results) return
    setPastExamResults(rec.results)
    setPastExamAllRevealed(true)
    setPastExamScoreRoundNo(roundNo)
    setShowPastExamScore(true)
  }

  const getPastExamWrongIds = roundNo => {
    const rec = pastExamRoundsData[roundNo]
    if (!rec?.results) return []
    const yearExams = allExams.filter(e => e.year === parseInt(filter.year, 10))
    return yearExams
      .filter(e => rec.results[e.id] && !rec.results[e.id].questionCorrect)
      .map(e => e.id)
  }

  const getPastExamCorrectIds = roundNo => {
    const rec = pastExamRoundsData[roundNo]
    if (!rec?.results) return []
    const yearExams = allExams.filter(e => e.year === parseInt(filter.year, 10))
    return yearExams.filter(e => rec.results[e.id]?.questionCorrect).map(e => e.id)
  }

  const startPastExamReview = (roundNo, kind) => {
    if (!onReviewPastExamRound || !isPastExamPlayableRound(roundNo)) return
    const ids = kind === 'correct' ? getPastExamCorrectIds(roundNo) : getPastExamWrongIds(roundNo)
    if (ids.length === 0) return
    setShowPastExamScore(false)
    setPastExamScoreRoundNo(null)
    onReviewPastExamRound(ids, filter.year, roundNo, kind)
  }

  const retryPastExamRoundWrong = roundNo => startPastExamReview(roundNo, 'wrong')
  const retryPastExamRoundCorrect = roundNo => startPastExamReview(roundNo, 'correct')

  const certifyRound5 = () => {
    if (onOpenRound5Cert && filter.year) onOpenRound5Cert(filter.year)
  }

  const round5CertAction =
    isPastExamYear && onOpenRound5Cert && pastExamRoundsData[5]?.completed
      ? certifyRound5
      : undefined

  const exitPastExamSolve = () => {
    setPastExamRound(null)
    setPastExamScoreRoundNo(null)
    setPastExamDrafts({})
    setPastExamAllRevealed(false)
    setPastExamResults({})
    setShowPastExamScore(false)
  }

  if (exams.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-bottom-nav">
        {appearance && onAppearanceChange && (
          <AuthBar appearance={appearance} onAppearanceChange={onAppearanceChange} />
        )}
        <TopBar
          title="학습 모드"
          onBack={onBack}
          onFilter={() => setShowFilter(true)}
          actionLabel={isRandomExam ? '다시뽑기' : '필터'}
          actionVariant={isRandomExam ? 'regenerate' : 'filter'}
          onScrollToTop={scrollStudyToTop}
        />
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

  const highlightTerm = filter.highlightTerm

  if (usePastExamSolveUI) {
    const pastTitle = isExamWrongNotes
      ? `오답노트 · ${exams.length}문항`
      : isRandomExam
      ? `랜덤 ${randomExamCount}문제`
      : isPastExamRetry
        ? pastExamRetryKind === 'correct'
          ? `맞춘 문제 · ${filter.year}년 ${formatPastExamRoundLabel(pastExamRetryRound)}`
          : `오답 보기 · ${filter.year}년 ${formatPastExamRoundLabel(pastExamRetryRound)}`
        : pastExamRound != null
          ? `${filter.year}년 · ${formatPastExamRoundLabel(pastExamRound)}`
          : exams[0]?.round != null
            ? `${filter.year}년 제${exams[0].round}회`
            : `${filter.year}년 기출`
    const inPastExamSolve = isRandomExam || isExamWrongNotes || isPastExamRetry || pastExamRound != null
    const roundLabel = isPastExamRetry ? pastExamRetryRound : pastExamRound

    const goBackFromPastExam = () => {
      if (isPastExamRetry && isPastExamYear) {
        onExitPastExamRetry?.()
        return
      }
      if (inPastExamSolve && isPastExamYear) {
        exitPastExamSolve()
        return
      }
      onBack()
    }

    const showAuthBar = appearance && onAppearanceChange

    const pastTopBar = (
      <TopBar
        title={pastTitle}
        onBack={goBackFromPastExam}
        onFilter={() => setShowFilter(true)}
        actionLabel={isRandomExam ? '다시뽑기' : '필터'}
        actionVariant={isRandomExam ? 'regenerate' : 'filter'}
        onScrollToTop={inPastExamSolve ? scrollStudyToTop : undefined}
        inScroll={inPastExamSolve}
      />
    )

    return (
      <div className="h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-slate-50 flex flex-col pb-bottom-nav">
        {showAuthBar && !inPastExamSolve && (
          <AuthBar appearance={appearance} onAppearanceChange={onAppearanceChange} />
        )}
        {!inPastExamSolve && pastTopBar}

        {isPastExamYear && !isPastExamRetry && !inPastExamSolve && (
          <PastExamTenRoundBar
            roundsData={pastExamRoundsData}
            activeRound={pastExamRound}
            onStartRound={startPastExamRound}
            onViewResult={viewPastExamRoundResult}
            onRetryWrong={retryPastExamRoundWrong}
            onRetryCorrect={retryPastExamRoundCorrect}
            onCertifyRound5={round5CertAction}
          />
        )}

        {isPastExamYear && pastExamRoundHint && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 px-4 py-2.5 rounded-xl bg-slate-800/95 text-white text-sm font-semibold shadow-lg pointer-events-none"
          >
            {pastExamRoundHint}
          </div>
        )}

        {isPastExamYear && !inPastExamSolve ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto">
            <p className="text-slate-600 text-sm leading-relaxed">
              <span className="font-bold text-slate-800">1~5회독</span> 중 하나를 선택하면 40문항을
              스크롤하며 풀 수 있습니다.
            </p>
            <p className="text-slate-500 text-xs mt-3">
              각 회독마다 채점 결과와 맞춘·틀린 문항 보기가 저장됩니다. 1~5회독은 완료 후 다시 풀 수 없고,
              5회독 완료 후 「회독무한반복」으로 추가 연습할 수 있습니다.
            </p>
          </div>
        ) : (
        <>
        <div className="flex flex-1 min-h-0 justify-center overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="past-exam-scroll h-full w-full max-w-2xl shrink-0 px-3 overflow-y-auto overscroll-y-contain"
        >
          {showAuthBar && inPastExamSolve && (
            <div className="-mx-3 shrink-0 pt-[env(safe-area-inset-top,0px)]">
              <AuthBar appearance={appearance} onAppearanceChange={onAppearanceChange} />
            </div>
          )}
          {inPastExamSolve && (
            <div className="sticky top-0 z-10 -mx-3 shrink-0 bg-white dark:bg-slate-800">
              {pastTopBar}
              {isExamWrongNotes && examWrongNotePageMeta && (
                <ExamWrongNotesPaginationBar
                  pageMeta={examWrongNotePageMeta}
                  pageSize={examWrongNotePageSize}
                  sort={examWrongNoteSort}
                  onPageSizeChange={setExamWrongNotePageSize}
                  onSortChange={setExamWrongNoteSort}
                  onPageChange={setExamWrongNotePage}
                />
              )}
            </div>
          )}
          {isPastExamYear && !isPastExamRetry && inPastExamSolve && (
            <div className="-mx-3 shrink-0">
              <PastExamTenRoundBar
                roundsData={pastExamRoundsData}
                activeRound={pastExamRound}
                onStartRound={startPastExamRound}
                onViewResult={viewPastExamRoundResult}
                onRetryWrong={retryPastExamRoundWrong}
                onRetryCorrect={retryPastExamRoundCorrect}
                onScrollToTop={scrollStudyToTop}
                onCertifyRound5={round5CertAction}
              />
            </div>
          )}
          {pastExamSolveExams.map((e, idx) => {
            const draft = pastExamDrafts[e.id] ?? { userAnswers: {}, finalChoice: null }
            const questionRevealed = isExamWrongNotes
              ? Boolean(pastExamResults[e.id])
              : pastExamAllRevealed
            return (
              <section
                key={e.id}
                data-index={idx}
                ref={el => {
                  sectionRefs.current[idx] = el
                }}
                className="past-exam-section flex flex-col justify-start border-b border-slate-100/90 dark:border-slate-700/50"
              >
                <div className="px-2 py-5">
                  <PastExamQuestionBlock
                    exam={e}
                    finalChoice={draft.finalChoice}
                    revealed={questionRevealed}
                    result={pastExamResults[e.id]}
                    onFinalPick={
                      isPastExamRetry ? undefined : no => setPastExamDraftFinal(e.id, no)
                    }
                    highlightTerm={highlightTerm}
                    inExamWrongNotes={isInExamWrongNotes?.(e.id)}
                    onToggleExamWrongNote={onToggleExamWrongNote}
                    perQuestionReveal={isExamWrongNotes}
                    onRevealQuestion={isExamWrongNotes ? handleRevealSinglePastExam : undefined}
                  />
                </div>
              </section>
            )
          })}

          <section
            ref={pastExamEndRef}
            className={`past-exam-section flex flex-col justify-start ${
              isExamWrongNotes ? '' : 'min-h-[40vh]'
            }`}
          >
            <div className="space-y-3 px-2 py-8 pb-16">
              {isExamWrongNotes ? (
                <>
                  <p className="text-center text-xs text-slate-500">
                    {pastExamSummary?.questionGraded ?? 0}/{pastExamSolveExams.length}문항 채점 완료
                    · 각 문항 아래 「정답 확인」을 누르세요.
                  </p>
                  {(pastExamSummary?.questionGraded ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPastExamScore(true)}
                      className="w-full bg-violet-600 text-white rounded-xl py-4 font-bold text-base hover:bg-violet-700"
                    >
                      채점 결과 보기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={goBackFromPastExam}
                    className="w-full bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold hover:bg-slate-200"
                  >
                    {exitLabel}
                  </button>
                  {examWrongNotePageMeta && !examWrongNotePageMeta.isAll
                    && examWrongNotePageMeta.totalPages > 1 && (
                    <ExamWrongNotesPageNav
                      page={examWrongNotePageMeta.page}
                      totalPages={examWrongNotePageMeta.totalPages}
                      onPageChange={setExamWrongNotePage}
                    />
                  )}
                </>
              ) : !pastExamAllRevealed ? (
                <>
                  <button
                    type="button"
                    onClick={handleRevealAllPastExam}
                    className="w-full bg-slate-800 text-white rounded-xl py-4 font-bold text-base hover:bg-slate-700"
                  >
                    정답 확인
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    스크롤하거나 오른쪽 아래 화살표로 이동한 뒤, 「정답 확인」을 누르세요.
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPastExamScore(true)}
                    className="w-full bg-violet-600 text-white rounded-xl py-4 font-bold text-base hover:bg-violet-700"
                  >
                    채점 결과 보기
                  </button>
                  <button
                    type="button"
                    onClick={goBackFromPastExam}
                    className="w-full bg-slate-100 text-slate-700 rounded-xl py-3 font-semibold hover:bg-slate-200"
                  >
                    {isPastExamYear && (inPastExamSolve || isPastExamRetry) ? '회독 선택으로' : exitLabel}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
        </div>
        <PastExamScrollArrows
          canGoTop={pastExamSolveExams.length > 0}
          canGoBottom={pastExamSolveExams.length > 0}
          onGoTop={goPastExamTop}
          onGoBottom={goPastExamBottom}
        />
        </>
        )}

        {showFilter && (
          <FilterSheet
            filter={filter}
            years={years}
            categories={categories}
            onFilterChange={onFilterChange}
            onClose={() => setShowFilter(false)}
            onRegenerateRandom={isRandomExam ? onRegenerateRandom : undefined}
          />
        )}

        {showPastExamScore && pastExamSummary && (
          <PastExamScoreSheet
            exams={pastExamSolveExams}
            results={pastExamResults}
            summary={pastExamSummary}
            showPassCriteria={isPastExamYear}
            onClose={() => setShowPastExamScore(false)}
            onCertifyRound5={
              pastExamScoreRoundNo === 5 ? round5CertAction : undefined
            }
          />
        )}
      </div>
    )
  }

  const progressPct = ((currentIndex + 1) / exams.length) * 100
  const correctMark = exam.correct_choice
    ? CHOICE_MARKERS[exam.correct_choice - 1]
    : null
  const termMatch = highlightTerm ? getTermMatchInfo(exam, highlightTerm) : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-bottom-nav">
      {appearance && onAppearanceChange && (
        <AuthBar appearance={appearance} onAppearanceChange={onAppearanceChange} />
      )}
      <TopBar
        title={
          isRandomExam
            ? `랜덤 ${randomExamCount}문제`
            : filter.chapterId
              ? filter.subcategory
                ? `${getChapterShortLabel(filter.chapterId) ?? '목차'} · ${filter.subcategory}`
                : getChapterShortLabel(filter.chapterId) ?? '목차별 학습'
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
        onBack={requestExit}
        onFilter={() => setShowFilter(true)}
        actionLabel={isRandomExam ? '다시뽑기' : '필터'}
        actionVariant={isRandomExam ? 'regenerate' : 'filter'}
        onScrollToTop={scrollStudyToTop}
      />

      <div className="bg-white px-4 pb-3 border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{currentIndex + 1} / {exams.length}문항</span>
          <span className="text-green-600 font-medium">
            {isPastExam && pastExamSummary
              ? `채점 ${pastExamSummary.questionGraded}/${pastExamSummary.questionTotal}`
                + (pastExamSummary.questionGraded > 0
                  ? ` · ${pastExamSummary.questionCorrect}정답`
                  : '')
              : sessionStats.correct > 0 || sessionStats.wrong > 0
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
        {isPastExam && pastExamSummary?.allGraded && (
          <button
            type="button"
            onClick={() => setShowPastExamScore(true)}
            className="mt-2 w-full text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            전체 채점 결과 보기 ({pastExamSummary.questionCorrect}/{pastExamSummary.questionTotal})
          </button>
        )}
      </div>

      <div ref={studyScrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {showQuestionJump && (
            <QuestionJumpBar
              exams={exams}
              currentIndex={currentIndex}
              currentExamId={exam.id}
              currentQuestionNo={exam.question_no}
              currentRound={exam.round}
              showRoundLabel={showRoundInJumpBar}
              progress={progress}
              pastExamResults={isPastExam ? pastExamResults : null}
              onJump={jumpToExam}
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
              onClick={handleNext}
              className={`flex-1 rounded-xl py-2.5 font-semibold text-sm ${
                currentIndex >= exams.length - 1
                  ? isPastExam && pastExamSummary?.allGraded
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {currentIndex >= exams.length - 1
                ? isPastExam && pastExamSummary?.allGraded
                  ? '채점 결과'
                  : exitLabel
                : '다음'}
            </button>
          </div>

          <div className="flex w-full items-center gap-2 min-w-0">
            <div
              className={`flex items-center gap-2 min-w-0 flex-1 ${
                isRandomExam ? 'flex-nowrap overflow-x-auto overscroll-x-contain py-0.5' : 'flex-wrap'
              }`}
            >
              <span className="shrink-0 text-xs bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100 rounded-full px-3 py-1 font-medium">
                {exam.category}
              </span>
              {exam.subcategory && (
                <span className="shrink-0 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-full px-3 py-1">
                  {highlightTerm ? (
                    <HighlightText text={exam.subcategory} term={highlightTerm} />
                  ) : (
                    exam.subcategory
                  )}
                </span>
              )}
              {isRandomExam && (
                <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap ml-8 sm:ml-14">
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

          <div className="relative bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <p className="text-slate-800 leading-relaxed text-base font-medium whitespace-pre-wrap">
              <QuestionNumberPrefix
                questionNo={exam.question_no}
                gradeCorrect={
                  isPastExam && questionRevealed && currentPastResult
                    ? currentPastResult.questionCorrect
                    : null
                }
              />
              <HighlightText text={exam.stem} term={highlightTerm} />
            </p>
            {exam.question_type === 'composite' && exam.combo_choices?.length > 0 && (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                {isPastExam
                  ? '아래에서 기출 선택지를 고른 뒤, 맨 아래 「정답 확인」을 누르세요.'
                  : '아래에서 ㄱ·ㄴ·ㄷ 등 각 보기 문장의 O/X를 고른 뒤, 맨 아래 기출 선택지와 대조하세요.'}
              </p>
            )}
            {isPastExamPickOne && (
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                {exam.question_type === 'wrong' ? '틀린' : '옳은'} 보기를 하나 고른 뒤, 맨 아래 「정답 확인」을
                누르세요.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {exam.items.map(item => {
              const picked = userAnswers[item.key]
              const oxChecked = revealedItems.has(item.key)
              const showOxFeedback = !isPastExam && oxChecked && !questionRevealed
              const showAnswerKey = isPastExam ? questionRevealed : questionRevealed || oxChecked
              const isRight = showOxFeedback && picked === item.answer
              const isWrong = showOxFeedback && picked != null && picked !== item.answer
              const canReveal = !isPastExam && picked != null && !oxChecked && !questionRevealed
              const controlsLocked = isPastExam
                ? questionRevealed
                : oxChecked || questionRevealed
              const pickPending =
                !isPastExam && picked != null && !oxChecked && !questionRevealed
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

              if (isPastExamPickOne) {
                const choiceNo = itemKeyToChoiceNo(item)
                if (choiceNo == null) return null
                const isSelected = pastExamFinalChoice === choiceNo
                const isExamAnswer = questionRevealed && choiceNo === exam.correct_choice
                const pickRight = questionRevealed && isSelected && currentPastResult?.finalCorrect
                const pickWrong = questionRevealed && isSelected && !currentPastResult?.finalCorrect

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={questionRevealed}
                    onClick={() => handlePastExamFinalPick(choiceNo)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                      pickRight
                        ? 'border-green-400 bg-green-50'
                        : pickWrong
                          ? 'border-red-400 bg-red-50'
                          : isExamAnswer
                            ? 'border-slate-800 bg-slate-50'
                            : isSelected
                              ? 'border-2 border-indigo-500 bg-indigo-100 shadow-md ring-2 ring-indigo-200/80'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex gap-2 min-w-0">
                      <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">
                        {item.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm leading-relaxed">
                          <HighlightText text={item.text} term={highlightTerm} />
                        </p>
                        {!questionRevealed && isSelected && (
                          <p className="text-xs font-bold text-indigo-700 mt-2">✓ 내가 고른 답</p>
                        )}
                        {questionRevealed && (
                          <div className="mt-2 space-y-1">
                            {isExamAnswer && (
                              <p className="text-xs font-semibold text-slate-800">기출 정답</p>
                            )}
                            {isSelected && (
                              <p
                                className={`text-xs font-semibold ${
                                  pickRight ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {pickRight ? '✓ 맞았습니다' : '✗ 틀렸습니다'}
                              </p>
                            )}
                            {itemExplanation && (
                              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                                <HighlightText text={itemExplanation} term={highlightTerm} />
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              }

              if (isPastExamComposite) {
                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl border-2 p-4 transition-colors ${
                      questionRevealed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex gap-2 min-w-0">
                      <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">
                        {item.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm leading-relaxed">
                          <HighlightText text={item.text} term={highlightTerm} />
                        </p>
                        {questionRevealed && (
                          <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1">
                            <p className="text-xs font-semibold">
                              <span className={item.answer === 'O' ? 'text-blue-600' : 'text-red-600'}>
                                정답 {item.answer}
                              </span>
                            </p>
                            {itemExplanation && (
                              <p className="text-xs text-slate-600 leading-relaxed">
                                <HighlightText text={itemExplanation} term={highlightTerm} />
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

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
                      {!isPastExam ? (
                        <>
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
                                ? 'border-slate-700 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-600'
                                : hasHistory
                                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/80'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="학습 기록"
                          >
                            {hasHistory ? `${itemAttempts.length}회` : '기록'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {!isPastExam && historyOpen && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-slate-700 shrink-0">학습 기록</p>
                        {itemAttempts.length > 0 && onClearItemAttempts && (
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryConfirm({
                                message: '정말 초기화 하시겠습니까?',
                                confirmLabel: '초기화',
                                onConfirm: () => onClearItemAttempts(exam.id, item.key),
                              })
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
                                  onClick={() => {
                                    setHistoryConfirm({
                                      message: '정말로 삭제 하겠습니까?',
                                      confirmLabel: '삭제',
                                      onConfirm: () =>
                                        onRemoveItemAttempt(exam.id, item.key, attempt.at),
                                    })
                                  }}
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
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {isPastExam ? '기출 선택지 (내 답 고르기)' : '정답 조합 (기출 선택지)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {exam.combo_choices.map(c => {
                  const isSelected = isPastExam && pastExamFinalChoice === c.no
                  const showComboFeedback = isPastExam && questionRevealed
                  const comboRight = showComboFeedback && isSelected && c.is_correct
                  const comboWrong = showComboFeedback && isSelected && !c.is_correct
                  const comboClass = showComboFeedback
                    ? c.is_correct
                      ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                      : comboWrong
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    : isSelected
                      ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-500 font-bold shadow-md ring-2 ring-indigo-200/80 scale-[1.02]'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'

                  if (isPastExam) {
                    return (
                      <button
                        key={c.no}
                        type="button"
                        disabled={questionRevealed}
                        onClick={() => handlePastExamFinalPick(c.no)}
                        aria-pressed={isSelected}
                        className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ${comboClass} ${
                          comboRight ? 'ring-2 ring-green-400' : ''
                        } ${isSelected && !showComboFeedback ? 'z-[1]' : ''}`}
                      >
                        {c.label} {c.text}
                        {comboRight && <span className="ml-1 text-green-200">✓</span>}
                        {comboWrong && <span className="ml-1">✗</span>}
                      </button>
                    )
                  }

                  return (
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
                  )
                })}
              </div>
            </div>
          )}

          {questionRevealed && isPastExam && currentPastResult && (
            <p
              className={`text-center text-sm font-semibold rounded-xl py-2 ${
                currentPastResult.questionCorrect
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {currentPastResult.questionCorrect ? '이 문항 정답' : '이 문항 오답'}
              {exam.correct_choice != null && (
                <span className="text-slate-600 font-normal ml-1">
                  · 기출 정답 {CHOICE_MARKERS[exam.correct_choice - 1]}
                </span>
              )}
            </p>
          )}

          {!questionRevealed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRevealQuestion}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                정답 확인
              </button>
            </div>
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

      {showPastExamScore && pastExamSummary && (
        <PastExamScoreSheet
          exams={exams}
          results={pastExamResults}
          summary={pastExamSummary}
          onClose={() => setShowPastExamScore(false)}
        />
      )}

      {showSessionSummary && (
        <StudySessionSummary
          summary={sessionSummary}
          onContinue={() => {
            setShowSessionSummary(false)
          }}
          onRetryWrong={
            onRetryWrongOnly && sessionSummary.wrongExamIds.length > 0
              ? () => {
                  setShowSessionSummary(false)
                  onRetryWrongOnly(sessionSummary.wrongExamIds)
                }
              : undefined
          }
          onExit={confirmSessionExit}
        />
      )}

      {historyConfirm && (
        <StudyConfirmModal
          message={historyConfirm.message}
          confirmLabel={historyConfirm.confirmLabel}
          onCancel={() => setHistoryConfirm(null)}
          onConfirm={() => {
            historyConfirm.onConfirm()
            setHistoryConfirm(null)
          }}
        />
      )}
    </div>
  )
}

function QuestionJumpBar({
  exams,
  currentIndex,
  currentExamId,
  currentQuestionNo,
  currentRound,
  showRoundLabel = false,
  progress,
  pastExamResults,
  onJump,
}) {
  const currentBtnRef = useRef(null)
  const yearLabel =
    new Set(exams.map(e => e.year)).size === 1 ? `${exams[0].year}년 ` : ''

  const getQuestionStatus = exam => {
    const pastRec = pastExamResults?.[exam.id]
    if (pastRec) return pastRec.questionCorrect ? 'correct' : 'wrong'
    if (isExamComplete(progress, exam.id)) {
      return isExamCorrect(progress, exam.id) ? 'correct' : 'wrong'
    }
    return 'unanswered'
  }

  const gradedCount = pastExamResults
    ? exams.filter(e => pastExamResults[e.id]).length
    : 0
  const answeredCount = pastExamResults
    ? gradedCount
    : exams.filter(e => getQuestionStatus(e) !== 'unanswered').length
  const unansweredCount = exams.length - answeredCount
  const positionNo = Math.min(Math.max(currentIndex, 0) + 1, exams.length)
  const progressLabel = pastExamResults ? '채점' : '진행'
  const progressNumerator = pastExamResults ? gradedCount : positionNo

  useEffect(() => {
    if (!currentBtnRef.current) return
    currentBtnRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [currentExamId])

  const currentPositionLabel = showRoundLabel
    ? `제${currentRound}회 ${currentQuestionNo}번`
    : `${currentQuestionNo}번`

  const currentExam = exams.find(e => e.id === currentExamId) ?? exams[currentIndex] ?? null
  const currentRoundCount =
    currentExam && !pastExamResults ? countExamStudyRoundAttempts(progress, currentExam) : 0
  const currentStatus = currentExam ? getQuestionStatus(currentExam) : 'unanswered'
  const currentStudyStatusLabel =
    !pastExamResults && currentRoundCount > 0 && currentStatus !== 'unanswered'
      ? `${currentQuestionNo}번 ${currentRoundCount}회독 완료`
      : currentPositionLabel

  const showStudyCompleteBadge =
    !pastExamResults && currentRoundCount > 0 && currentStatus !== 'unanswered'
  const studyRoundBadgeClass =
    currentStatus === 'correct'
      ? 'bg-green-100 border-green-200'
      : currentStatus === 'wrong'
        ? 'bg-red-100 border-red-200'
        : 'bg-lime-100 border-lime-200'

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2 py-2 min-w-0 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-xs font-semibold text-slate-600 shrink-0">
          {yearLabel}{showRoundLabel ? '목차' : '문항'}
        </span>
        <span className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[8rem] min-h-[1.375rem] leading-snug">
          {showStudyCompleteBadge ? (
            <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-slate-900 tabular-nums shrink-0">
              <span>{currentQuestionNo}번</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-md border ${studyRoundBadgeClass}`}
              >
                {currentRoundCount}회독
              </span>
              <span>완료</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-800 tabular-nums shrink-0">
              {currentStudyStatusLabel}
            </span>
          )}
          <span className="text-sm font-normal text-slate-500 tabular-nums shrink-0">
            · {progressNumerator}/{exams.length} {progressLabel}
          </span>
        </span>
        <span className="text-xs font-medium text-slate-500 shrink-0 tabular-nums whitespace-nowrap">
          {pastExamResults ? `채점 ${gradedCount}` : `풀이 ${answeredCount} · 미풀이 ${unansweredCount}`}
        </span>
      </div>

      <div className="flex items-center gap-3 px-1 text-[9px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm border-2 border-indigo-300 bg-white" aria-hidden />
          미풀이
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500" aria-hidden />
          정답
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400" aria-hidden />
          오답
        </span>
      </div>

      <div
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 -mx-0.5 px-0.5 snap-x snap-mandatory"
        role="list"
      >
        {exams.map(e => {
          const isCurrent = e.id === currentExamId
          const status = getQuestionStatus(e)
          let statusClass = 'bg-white text-slate-700 border-2 border-indigo-200 hover:border-indigo-400'
          if (status === 'correct') {
            statusClass = 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
          } else if (status === 'wrong') {
            statusClass = 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
          }
          if (isCurrent) {
            statusClass = 'bg-slate-800 text-white border-slate-800 ring-2 ring-offset-1 ring-slate-400'
          }
          const roundLabel = `${e.round}회`
          const attemptCount = !pastExamResults ? countExamStudyRoundAttempts(progress, e) : 0
          const studyRoundLabel =
            !showRoundLabel && attemptCount > 0 ? `${attemptCount}회` : null
          const topLabel = showRoundLabel ? roundLabel : studyRoundLabel
          const hasTopLabel = Boolean(topLabel)
          const ariaDetail = showRoundLabel
            ? `${e.year}년 제${e.round}회 ${e.question_no}번`
            : `${e.question_no}번`
          const studyRoundAria = studyRoundLabel ? ` ${attemptCount}회독` : ''
          return (
            <button
              key={e.id}
              type="button"
              role="listitem"
              onClick={() => onJump(e.id)}
              ref={isCurrent ? currentBtnRef : undefined}
              aria-label={`${ariaDetail}${studyRoundAria}${status === 'unanswered' ? ' 미풀이' : status === 'correct' ? ' 정답' : ' 오답'}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`relative snap-center shrink-0 min-w-[2.25rem] rounded-md border text-[11px] font-semibold transition-colors flex flex-col items-center justify-center gap-0.5 py-1 ${
                hasTopLabel ? 'min-h-[2.75rem]' : 'h-8'
              } ${statusClass}`}
            >
              {hasTopLabel && (
                <span
                  className={`text-[8px] font-medium leading-none tabular-nums ${
                    isCurrent ? 'text-white/85' : 'opacity-80'
                  }`}
                >
                  {topLabel}
                </span>
              )}
              <span className="leading-none tabular-nums">{e.question_no}</span>
              {status !== 'unanswered' && !isCurrent && (
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    status === 'correct' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExamWrongNotesPageNav({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(p => p - 1)}
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
        onClick={() => onPageChange(p => p + 1)}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
      >
        다음
      </button>
    </div>
  )
}

function examWrongNoteChipClass(active) {
  return active
    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-700 dark:ring-indigo-800/60'
    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
}

function ExamWrongNotesPaginationBar({
  pageMeta,
  pageSize,
  sort,
  onPageSizeChange,
  onSortChange,
  onPageChange,
}) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2.5 space-y-2 bg-slate-50/80 dark:bg-slate-900/40">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSortChange('recent')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${examWrongNoteChipClass(sort === 'recent')}`}
        >
          최신순
        </button>
        <button
          type="button"
          onClick={() => onSortChange('oldest')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${examWrongNoteChipClass(sort === 'oldest')}`}
        >
          과거순
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXAM_WRONG_NOTE_PAGE_SIZE_OPTIONS.map(opt => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onPageSizeChange(opt.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${examWrongNoteChipClass(pageSize === opt.value)}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {pageMeta.total > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pageMeta.isAll
              ? `${pageMeta.total}문항 전체`
              : `${pageMeta.rangeStart}–${pageMeta.rangeEnd} / ${pageMeta.total}문항 · ${pageMeta.page} / ${pageMeta.totalPages}페이지`}
          </p>
          {!pageMeta.isAll && pageMeta.totalPages > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={pageMeta.page <= 1}
                onClick={() => onPageChange(pageMeta.page - 1)}
                className="px-2 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                이전
              </button>
              <button
                type="button"
                disabled={pageMeta.page >= pageMeta.totalPages}
                onClick={() => onPageChange(pageMeta.page + 1)}
                className="px-2 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TopBar({
  title,
  onBack,
  onFilter,
  actionLabel = '필터',
  actionVariant = 'filter',
  onScrollToTop,
  inScroll = false,
}) {
  const actionClass =
    actionVariant === 'regenerate'
      ? 'top-bar-regenerate-btn'
      : 'text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1.5 font-medium hover:bg-slate-200 border border-transparent'

  const outerClass = inScroll
    ? 'relative bg-white border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700'
    : 'relative bg-white border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10 pt-[env(safe-area-inset-top,0px)]'

  return (
    <div className={outerClass}>
      {onScrollToTop ? (
        <button
          type="button"
          aria-label="맨 위로"
          onClick={onScrollToTop}
          className="absolute inset-x-0 top-0 h-[env(safe-area-inset-top,0px)] min-h-0 z-[1]"
        />
      ) : null}
      <div className="relative z-[2] max-w-2xl mx-auto px-3 py-3 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800 p-1 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {onScrollToTop ? (
          <button
            type="button"
            onClick={onScrollToTop}
            className="flex-1 min-w-0 text-left py-1 -my-1 touch-manipulation"
            aria-label="맨 위로"
          >
            <span className="block font-bold text-slate-800 truncate text-sm">{title}</span>
          </button>
        ) : (
          <h1 className="flex-1 font-bold text-slate-800 truncate text-sm">{title}</h1>
        )}
        {onFilter && actionVariant !== 'filter' ? (
          <button type="button" onClick={onFilter} className={`shrink-0 ${actionClass}`}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FilterSheet({ filter, years, categories, onFilterChange, onClose, onRegenerateRandom }) {
  const [localFilter, setLocalFilter] = useState(filter)
  const isRandomExam = isRandomStudyMode(filter)
  const randomExamCount = isRandomExam ? getRandomExamCount(filter) : null

  const handleApply = () => {
    onFilterChange(localFilter)
    onClose()
  }

  if (isRandomExam) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <div
          role="dialog"
          aria-labelledby="random-exam-sheet-title"
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/80 dark:border-slate-600 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="random-exam-sheet-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
              랜덤 세트
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400" aria-label="닫기">
              ✕
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
            출제 빈도(소분류)를 반영해 {getRandomExamCount(filter)}문항을 뽑았습니다. 다시 뽑으면 다른
            조합이 나옵니다.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-labelledby="filter-sheet-title"
        className="relative w-full max-w-lg max-h-[min(88vh,36rem)] overflow-y-auto rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/80 dark:border-slate-600 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="filter-sheet-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            필터
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400" aria-label="닫기">
            ✕
          </button>
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
