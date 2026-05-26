import { useState, useEffect, useMemo, useCallback } from 'react'
import HomeScreen from './components/HomeScreen'
import ExamScreen from './components/ExamScreen'
import IndexScreen from './components/IndexScreen'
import NotesScreen from './components/NotesScreen'
import CommunityScreen from './components/CommunityScreen'
import AuthBar from './components/AuthBar'
import { useAuth } from './contexts/AuthContext'
import { loadCommunityPosts, pickMetaFields, saveCommunityPosts } from './data/communityPosts'
import { ensureAppGuideNotice } from './data/seedAppGuideNotice'
import { enrichPost, removePostMeta, savePostMeta } from './data/communityPostMeta'
import {
  deleteCommunityPost as deleteCloudPost,
  fetchCommunityPosts,
  insertCommunityPost,
  isCloudPostId,
} from './data/supabaseCommunity'
import { useCloudSync } from './hooks/useCloudSync'
import StudyMode from './components/StudyMode'
import WrongNotes from './components/WrongNotes'
import StatsScreen from './components/StatsScreen'
import BottomNav from './components/BottomNav'
import {
  allExams,
  filterWrongExamsByKind,
  sortWrongExamsByRecent,
  sortExams,
  isExamComplete,
  isExamCorrect,
  findProgressAwareStudyExamId,
} from './data/loadExam'
import { getWrongNoteKind } from './data/todayStudySpot'
import {
  buildWeightedRandomExamSet,
  getRandomExamCount,
  isRandomStudyMode,
  maxPerYearForRandomCount,
} from './data/randomExamSet'
import { clearStudyResume } from './data/studyResume'
import { buildStudyNote, makeNoteId } from './data/studyNotes'
import {
  applyAppearanceSettings,
  loadAppearanceSettings,
  saveAppearanceSettings,
} from './data/appearanceSettings'
import { getChapterById, filterExamsByChapter } from './data/curriculum'

const STORAGE_KEY = 'ox_quiz_progress_v2'
const NOTES_STORAGE_KEY = 'ox_quiz_notes_v1'

const DEFAULT_FILTER = {
  mode: null,
  chapterId: null,
  category: null,
  subcategory: null,
  year: null,
  examId: null,
  status: 'all',
  sort: 'number',
  highlightTerm: null,
  randomCount: null,
}

function emptyStudySlot(returnScreen = 'home') {
  return {
    active: false,
    returnScreen,
    filter: { ...DEFAULT_FILTER },
    randomExams: null,
    pastExamExams: null,
    pastExamRound: null,
    pastExamRetryKind: null,
    startExamId: null,
    customExams: null,
  }
}

function studySessionKey(slot) {
  if (slot.customExams?.length) {
    return `custom-${slot.customExams.map(e => e.id).join(',')}`
  }
  if (slot.filter.mode === 'pastExam') {
    return `past-${slot.pastExamExams?.map(e => e.id).join(',') ?? `y${slot.filter.year}`}`
  }
  if (isRandomStudyMode(slot.filter)) {
    return `random-${slot.filter.randomCount ?? 40}-${slot.randomExams?.map(e => e.id).join(',') ?? 'new'}`
  }
  if (slot.filter.chapterId) {
    return `study-ch-${slot.filter.chapterId}-${slot.filter.subcategory ?? ''}`
  }
  return `study-${slot.filter.year ?? 'all'}-${slot.filter.category ?? ''}-${slot.filter.subcategory ?? ''}`
}

function buildExamsForSlot(slot, allExams, progress) {
  if (slot.customExams?.length) {
    return slot.customExams
  }
  if (isRandomStudyMode(slot.filter) && slot.randomExams?.length) {
    return slot.randomExams
  }
  if (slot.filter.mode === 'pastExam' && slot.pastExamExams?.length) {
    return slot.pastExamExams
  }
  let filtered = [...allExams]
  if (slot.filter.chapterId) {
    const chapter = getChapterById(slot.filter.chapterId)
    if (chapter) {
      filtered = filterExamsByChapter(filtered, chapter)
    }
    if (slot.filter.subcategory) {
      filtered = filtered.filter(q => q.subcategory === slot.filter.subcategory)
    }
  } else {
    if (slot.filter.category) {
      filtered = filtered.filter(q => q.category === slot.filter.category)
    }
    if (slot.filter.subcategory) {
      filtered = filtered.filter(q => q.subcategory === slot.filter.subcategory)
    }
  }
  if (slot.filter.year) {
    filtered = filtered.filter(q => q.year === parseInt(slot.filter.year, 10))
  }
  if (slot.filter.status === 'unanswered') {
    filtered = filtered.filter(q => !isExamComplete(progress, q.id))
  } else if (slot.filter.status === 'wrong') {
    filtered = filtered.filter(q => isExamComplete(progress, q.id) && !isExamCorrect(progress, q.id))
  }
  return sortExams(filtered, slot.filter.sort)
}

function App() {
  const { user, isConfigured } = useAuth()
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState('home')
  const [wrongNotesKind, setWrongNotesKind] = useState('year')
  const [homeStudy, setHomeStudy] = useState(() => emptyStudySlot('home'))
  const [examStudy, setExamStudy] = useState(() => emptyStudySlot('exam'))
  const [visibleStudySlot, setVisibleStudySlot] = useState(null)
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [communityPosts, setCommunityPosts] = useState(() =>
    ensureAppGuideNotice(loadCommunityPosts()),
  )

  const [appearance, setAppearance] = useState(() => loadAppearanceSettings())

  const examYears = useMemo(
    () => [...new Set(allExams.map(e => e.year))].sort((a, b) => b - a),
    []
  )

  useCloudSync({
    user,
    isConfigured,
    progress,
    notes,
    appearance,
    examYears,
    setProgress,
    setNotes,
    setAppearance,
  })

  useEffect(() => {
    if (!user || !isConfigured) return undefined
    let cancelled = false
    fetchCommunityPosts().then(posts => {
      if (!cancelled && posts) setCommunityPosts(ensureAppGuideNotice(posts))
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, isConfigured])

  useEffect(() => {
    applyAppearanceSettings(appearance)
    saveAppearanceSettings(appearance)
  }, [appearance])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    saveCommunityPosts(communityPosts)
  }, [communityPosts])

  const addCommunityPost = useCallback(
    async post => {
      const meta = pickMetaFields(post)
      if (user) {
        const saved = await insertCommunityPost(user.id, post)
        if (saved) {
          savePostMeta(saved.id, meta)
          setCommunityPosts(prev => [enrichPost({ ...saved, authorId: user.id }), ...prev])
          return enrichPost({ ...saved, authorId: user.id })
        }
      }
      savePostMeta(post.id, meta)
      const full = enrichPost(post)
      setCommunityPosts(prev => [full, ...prev])
      return full
    },
    [user],
  )

  const deleteCommunityPost = useCallback(
    async postId => {
      if (user && isCloudPostId(postId)) {
        const ok = await deleteCloudPost(postId)
        if (!ok) return
      }
      removePostMeta(postId)
      setCommunityPosts(prev => prev.filter(p => p.id !== postId))
    },
    [user],
  )

  const updateProgress = (examId, result, studyFilter) => {
    const wrongNoteKind =
      result.correct === false ? getWrongNoteKind(studyFilter) : null
    setProgress(prev => {
      const prevExam = prev[examId] || {}
      return {
        ...prev,
        [examId]: {
          ...prevExam,
          ...result,
          attempts: (prevExam.attempts || 0) + 1,
          lastAnswered: Date.now(),
          ...(result.correct === false ? { wrongNoteDismissed: false } : {}),
          ...(wrongNoteKind ? { wrongNoteKind } : {}),
        },
      }
    })
  }

  const dismissWrongNote = examId => {
    setProgress(prev => {
      const prevExam = prev[examId]
      if (!prevExam) return prev
      return {
        ...prev,
        [examId]: {
          ...prevExam,
          wrongNoteDismissed: true,
        },
      }
    })
  }

  const toggleStudyNote = (exam, item) => {
    const id = makeNoteId(exam.id, item.key)
    setNotes(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else {
        const note = buildStudyNote(exam, item)
        if (prev[id]?.important) note.important = true
        next[id] = note
      }
      return next
    })
  }

  const removeStudyNote = note => {
    setNotes(prev => {
      const next = { ...prev }
      delete next[note.id]
      return next
    })
  }

  const toggleNoteImportant = note => {
    setNotes(prev => {
      const existing = prev[note.id]
      if (!existing) return prev
      return {
        ...prev,
        [note.id]: { ...existing, important: !existing.important },
      }
    })
  }

  const logItemAttempt = (examId, itemKey, { pick, correct }) => {
    setProgress(prev => {
      const prevExam = prev[examId] || {}
      const prevItems = prevExam.itemAttempts || {}
      const prevList = prevItems[itemKey] || []
      return {
        ...prev,
        [examId]: {
          ...prevExam,
          itemAttempts: {
            ...prevItems,
            [itemKey]: [...prevList, { at: Date.now(), pick, correct }],
          },
        },
      }
    })
  }

  const clearItemAttempts = (examId, itemKey) => {
    setProgress(prev => {
      const prevExam = prev[examId]
      if (!prevExam?.itemAttempts?.[itemKey]?.length) return prev
      const nextItems = { ...prevExam.itemAttempts }
      delete nextItems[itemKey]
      return {
        ...prev,
        [examId]: { ...prevExam, itemAttempts: nextItems },
      }
    })
  }

  const removeItemAttempt = (examId, itemKey, at) => {
    setProgress(prev => {
      const prevExam = prev[examId]
      const prevList = prevExam?.itemAttempts?.[itemKey]
      if (!prevList?.length) return prev
      const nextList = prevList.filter(a => a.at !== at)
      const nextItems = { ...prevExam.itemAttempts }
      if (nextList.length === 0) delete nextItems[itemKey]
      else nextItems[itemKey] = nextList
      return {
        ...prev,
        [examId]: { ...prevExam, itemAttempts: nextItems },
      }
    })
  }

  const wrongExamsByKind = useMemo(
    () => ({
      year: sortWrongExamsByRecent(
        filterWrongExamsByKind(allExams, progress, 'year'),
        progress
      ),
      category: sortWrongExamsByRecent(
        filterWrongExamsByKind(allExams, progress, 'category'),
        progress
      ),
    }),
    [progress]
  )

  const openStudy = (filter, returnTo = 'home', slotOverrides = {}) => {
    const slotId = returnTo === 'exam' ? 'exam' : 'home'
    const setSlot = slotId === 'exam' ? setExamStudy : setHomeStudy
    const { examId: explicitStartId, ...rest } = filter
    const next = { ...DEFAULT_FILTER, ...rest }
    if (explicitStartId && !next.year) {
      const target = allExams.find(e => e.id === explicitStartId)
      if (target) next.year = target.year
    }

    const previewSlot = {
      active: true,
      returnScreen: returnTo,
      filter: next,
      randomExams: isRandomStudyMode(next) ? slotOverrides.randomExams ?? null : null,
      pastExamExams: next.mode === 'pastExam' ? slotOverrides.pastExamExams ?? null : null,
      pastExamRound: null,
      customExams: slotOverrides.customExams ?? null,
    }

    let startId = explicitStartId ?? null
    if (
      !startId
      && !slotOverrides.customExams?.length
      && !isRandomStudyMode(next)
      && next.mode !== 'pastExam'
    ) {
      const scopeExams = buildExamsForSlot(previewSlot, allExams, progress)
      startId = findProgressAwareStudyExamId(scopeExams, progress, next.sort)
    }

    setSlot(prev => {
      const randomExams = isRandomStudyMode(next)
        ? slotOverrides.randomExams ?? prev.randomExams
        : null
      const pastExamExams =
        next.mode === 'pastExam' ? slotOverrides.pastExamExams ?? prev.pastExamExams : null
      const pastExamRound =
        next.mode === 'pastExam' ? slotOverrides.pastExamRound ?? prev.pastExamRound : null
      const customExams = slotOverrides.customExams ?? null
      const nextSlot = {
        active: true,
        returnScreen: returnTo,
        filter: next,
        startExamId: startId,
        randomExams,
        pastExamExams,
        pastExamRound,
        customExams,
      }
      clearStudyResume(`${slotId}:${studySessionKey(nextSlot)}`)
      return nextSlot
    })

    setVisibleStudySlot(slotId)
    setScreen('study')
    setTab(slotId === 'exam' ? 'exam' : 'home')
  }

  const openStudyWithExams = (examList, returnTo = 'home') => {
    if (!examList?.length) return
    const sorted = sortExams(examList, 'number')
    const startId = findProgressAwareStudyExamId(sorted, progress, 'number')
    openStudy(
      { ...DEFAULT_FILTER, status: 'all', sort: 'number', examId: startId },
      returnTo,
      { customExams: sorted }
    )
  }

  const openRandomStudy = (count = 40) => {
    const total = Math.min(count, allExams.length)
    if (total < 1) return
    const set = buildWeightedRandomExamSet(allExams, {
      total,
      maxPerYear: maxPerYearForRandomCount(total),
    })
    if (set.length === 0) return
    openStudy(
      {
        mode: 'random',
        randomCount: total,
        category: null,
        subcategory: null,
        year: null,
        examId: null,
        status: 'all',
      },
      'exam',
      { randomExams: set }
    )
  }

  const openPastExamStudy = year => {
    openStudy(
      {
        mode: 'pastExam',
        category: null,
        subcategory: null,
        year,
        examId: null,
        status: 'all',
        sort: 'number',
      },
      'exam',
      { pastExamExams: null, pastExamRound: null }
    )
  }

  const reviewPastExamRound = (examIds, year, roundNo, kind = 'wrong') => {
    const subset = sortExams(
      allExams.filter(e => examIds.includes(e.id)),
      'number'
    )
    if (subset.length === 0) return
    const slot = {
      ...emptyStudySlot('exam'),
      active: true,
      returnScreen: 'exam',
      filter: {
        ...DEFAULT_FILTER,
        mode: 'pastExam',
        category: null,
        subcategory: null,
        year,
        examId: null,
        status: 'all',
        sort: 'number',
      },
      pastExamExams: subset,
      pastExamRound: roundNo ?? null,
      pastExamRetryKind: kind,
      startExamId: null,
    }
    clearStudyResume(`exam:${studySessionKey(slot)}`)
    setExamStudy(slot)
    setVisibleStudySlot('exam')
    setScreen('study')
    setTab('exam')
  }

  const regenerateRandomStudy = () => {
    setExamStudy(prev => {
      const count = getRandomExamCount(prev.filter)
      const total = Math.min(count, allExams.length)
      const set = buildWeightedRandomExamSet(allExams, {
        total,
        maxPerYear: maxPerYearForRandomCount(total),
      })
      if (set.length === 0) return prev
      return { ...prev, randomExams: set, startExamId: null }
    })
  }

  const exitStudy = slotId => {
    const slot = slotId === 'exam' ? examStudy : homeStudy
    clearStudyResume(`${slotId}:${studySessionKey(slot)}`)
    const clearSlot = slotId === 'exam' ? setExamStudy : setHomeStudy
    clearSlot(emptyStudySlot(slot.returnScreen))
    setVisibleStudySlot(null)
    setScreen(slot.returnScreen)
    setTab(slot.returnScreen)
  }

  const goTab = next => {
    if (next === 'home' && homeStudy.active) {
      setTab('home')
      setVisibleStudySlot('home')
      setScreen('study')
      return
    }
    if (next === 'exam' && examStudy.active) {
      setTab('exam')
      setVisibleStudySlot('exam')
      setScreen('study')
      return
    }
    setVisibleStudySlot(null)
    setTab(next)
    setScreen(next)
  }

  const renderStudySlot = slotId => {
    const slot = slotId === 'exam' ? examStudy : homeStudy
    if (!slot.active) return null
    const exams = buildExamsForSlot(slot, allExams, progress)
    const resumeKey = `${slotId}:${studySessionKey(slot)}`
    const visible = screen === 'study' && visibleStudySlot === slotId

    return (
      <div key={slotId} className={visible ? undefined : 'hidden'} aria-hidden={!visible}>
        <StudyMode
          studyVisible={visible}
          resumeStorageKey={resumeKey}
          key={resumeKey}
          exams={exams}
          startExamId={slot.startExamId}
          isPastExamRetry={Boolean(slot.pastExamExams?.length)}
          progress={progress}
          filter={slot.filter}
          allExams={allExams}
          onUpdateProgress={(examId, result) => updateProgress(examId, result, slot.filter)}
          onLogItemAttempt={logItemAttempt}
          onClearItemAttempts={clearItemAttempts}
          onRemoveItemAttempt={removeItemAttempt}
          savedNotes={notes}
          onToggleNote={toggleStudyNote}
          onBack={() => exitStudy(slotId)}
          onReviewPastExamRound={reviewPastExamRound}
          pastExamRetryRound={slot.pastExamRound}
          pastExamRetryKind={slot.pastExamRetryKind}
          onFilterChange={next => {
            const setSlot = slotId === 'exam' ? setExamStudy : setHomeStudy
            setSlot(prev => ({ ...prev, filter: { ...DEFAULT_FILTER, ...next } }))
          }}
          onRegenerateRandom={
            slotId === 'exam' && isRandomStudyMode(slot.filter) ? regenerateRandomStudy : undefined
          }
          onRetryWrongOnly={examIds => openStudyWithExams(
            allExams.filter(e => examIds.includes(e.id)),
            slot.returnScreen
          )}
          exitLabel={slot.returnScreen === 'exam' ? '시험으로' : '홈으로'}
          appearance={appearance}
          onAppearanceChange={setAppearance}
        />
      </div>
    )
  }

  if (screen === 'wrongnotes') {
    return (
      <>
        <WrongNotes
          kind={wrongNotesKind}
          exams={wrongExamsByKind[wrongNotesKind]}
          allExams={allExams}
          progress={progress}
          onUpdateProgress={(examId, result) =>
            updateProgress(
              examId,
              result,
              wrongNotesKind === 'year' ? { year: 2020 } : { chapterId: 'review' }
            )
          }
          onLogItemAttempt={logItemAttempt}
          onClearItemAttempts={clearItemAttempts}
          onRemoveItemAttempt={removeItemAttempt}
          savedNotes={notes}
          onToggleNote={toggleStudyNote}
          onDismissWrongNote={dismissWrongNote}
          onBack={() => {
            setScreen('home')
            setTab('home')
          }}
          appearance={appearance}
          onAppearanceChange={setAppearance}
        />
        <BottomNav
          active={tab}
          onHome={() => goTab('home')}
          onExam={() => goTab('exam')}
          onIndex={() => goTab('index')}
          onNotes={() => goTab('notes')}
          onCommunity={() => goTab('community')}
        />
      </>
    )
  }

  return (
    <>
      {!(screen === 'study' && visibleStudySlot) && screen !== 'stats' && (
        <AuthBar appearance={appearance} onAppearanceChange={setAppearance} />
      )}
      {renderStudySlot('home')}
      {renderStudySlot('exam')}
      {screen === 'exam' ? (
        <ExamScreen
          exams={allExams}
          onStartPastExam={openPastExamStudy}
          onStartRandom={openRandomStudy}
          onOpenStats={() => {
            setScreen('stats')
            setTab('exam')
          }}
        />
      ) : screen === 'stats' ? (
        <StatsScreen
          exams={allExams}
          onBack={() => {
            setScreen('home')
            setTab('home')
          }}
          onStartStudy={({ chapterId, category, subcategory }) => {
            openStudy({
              chapterId: chapterId ?? null,
              category: category ?? null,
              subcategory: subcategory ?? null,
              year: null,
              examId: null,
            }, 'home')
          }}
        />
      ) : screen === 'index' ? (
        <IndexScreen exams={allExams} savedNotes={notes} onToggleNote={toggleStudyNote} />
      ) : screen === 'notes' ? (
        <NotesScreen
          notes={notes}
          onToggleNote={removeStudyNote}
          onToggleImportant={toggleNoteImportant}
          onOpenQuestion={examId => {
            openStudy({ examId, highlightTerm: null }, 'notes')
          }}
        />
      ) : screen === 'community' ? (
        <CommunityScreen
          posts={communityPosts}
          onAddPost={addCommunityPost}
          onDeletePost={deleteCommunityPost}
        />
      ) : screen === 'home' ? (
        <HomeScreen
          exams={allExams}
          progress={progress}
          notes={notes}
          wrongCounts={{
            year: wrongExamsByKind.year.length,
            category: wrongExamsByKind.category.length,
          }}
          onStartStudy={({ chapterId, category, subcategory }) => {
            openStudy({
              chapterId: chapterId ?? null,
              category: category ?? null,
              subcategory: subcategory ?? null,
              year: null,
              examId: null,
            }, 'home')
          }}
          onStartStudyByYear={year => {
            openStudy({ chapterId: null, category: null, year, examId: null }, 'home')
          }}
          onResumeTodayStudy={spot => {
            if (!spot?.filter || !spot.examId) return
            openStudy({ ...spot.filter, examId: spot.examId }, 'home')
          }}
          onOpenWrongNotes={kind => {
            setWrongNotesKind(kind)
            setScreen('wrongnotes')
            setTab('home')
          }}
          onOpenStats={() => {
            setScreen('stats')
            setTab('home')
          }}
        />
      ) : null}
      <BottomNav
        active={
          screen === 'study' && visibleStudySlot ? (visibleStudySlot === 'exam' ? 'exam' : 'home') : tab
        }
        onHome={() => goTab('home')}
        onExam={() => goTab('exam')}
        onIndex={() => goTab('index')}
        onNotes={() => goTab('notes')}
        onCommunity={() => goTab('community')}
      />
    </>
  )
}

export default App
