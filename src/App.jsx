import { useState, useEffect, useMemo, useCallback } from 'react'
import HomeScreen from './components/HomeScreen'
import ExamScreen from './components/ExamScreen'
import IndexScreen from './components/IndexScreen'
import NotesScreen from './components/NotesScreen'
import CommunityScreen from './components/CommunityScreen'
import AuthBar from './components/AuthBar'
import { useAuth } from './contexts/AuthContext'
import { loadCommunityPosts, pickMetaFields, saveCommunityPosts } from './data/communityPosts'
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
import BottomNav from './components/BottomNav'
import { allExams, sortExams, isExamComplete, isExamCorrect } from './data/loadExam'
import {
  buildWeightedRandomExamSet,
  getRandomExamCount,
  isRandomStudyMode,
  maxPerYearForRandomCount,
} from './data/randomExamSet'
import { buildStudyNote, makeNoteId } from './data/studyNotes'
import {
  applyAppearanceSettings,
  loadAppearanceSettings,
  saveAppearanceSettings,
} from './data/appearanceSettings'

const STORAGE_KEY = 'ox_quiz_progress_v2'
const NOTES_STORAGE_KEY = 'ox_quiz_notes_v1'

const DEFAULT_FILTER = {
  mode: null,
  category: null,
  subcategory: null,
  year: null,
  examId: null,
  status: 'all',
  sort: 'number',
  highlightTerm: null,
  randomCount: null,
}

function App() {
  const { user, isConfigured } = useAuth()
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState('home')
  const [studyReturnScreen, setStudyReturnScreen] = useState('home')
  const [studyFilter, setStudyFilter] = useState({ ...DEFAULT_FILTER })
  const [studyRandomExams, setStudyRandomExams] = useState(null)
  const [studyPastExamExams, setStudyPastExamExams] = useState(null)
  const [studyPastExamRound, setStudyPastExamRound] = useState(null)
  const [studyStartExamId, setStudyStartExamId] = useState(null)
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

  const [communityPosts, setCommunityPosts] = useState(() => loadCommunityPosts())

  const [appearance, setAppearance] = useState(() => loadAppearanceSettings())

  useCloudSync({
    user,
    isConfigured,
    progress,
    notes,
    appearance,
    setProgress,
    setNotes,
    setAppearance,
  })

  useEffect(() => {
    if (!user || !isConfigured) return undefined
    let cancelled = false
    fetchCommunityPosts().then(posts => {
      if (!cancelled && posts) setCommunityPosts(posts)
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

  const updateProgress = (examId, result) => {
    setProgress(prev => ({
      ...prev,
      [examId]: {
        ...result,
        attempts: (prev[examId]?.attempts || 0) + 1,
        lastAnswered: Date.now(),
      },
    }))
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

  const getStudyExams = useMemo(() => {
    if (isRandomStudyMode(studyFilter) && studyRandomExams?.length) {
      return studyRandomExams
    }
    if (studyFilter.mode === 'pastExam' && studyPastExamExams?.length) {
      return studyPastExamExams
    }
    let filtered = [...allExams]
    if (studyFilter.category) {
      filtered = filtered.filter(q => q.category === studyFilter.category)
    }
    if (studyFilter.subcategory) {
      filtered = filtered.filter(q => q.subcategory === studyFilter.subcategory)
    }
    if (studyFilter.year) {
      filtered = filtered.filter(q => q.year === parseInt(studyFilter.year, 10))
    }
    if (studyFilter.status === 'unanswered') {
      filtered = filtered.filter(q => !isExamComplete(progress, q.id))
    } else if (studyFilter.status === 'wrong') {
      filtered = filtered.filter(q => isExamComplete(progress, q.id) && !isExamCorrect(progress, q.id))
    }
    return sortExams(filtered, studyFilter.sort)
  }, [studyFilter, studyRandomExams, studyPastExamExams, progress])

  const wrongExams = useMemo(
    () =>
      sortExams(
        allExams.filter(q => isExamComplete(progress, q.id) && !isExamCorrect(progress, q.id)),
        'number'
      ),
    [progress]
  )

  const openStudy = (filter, returnTo = 'home') => {
    const { examId: startId, ...rest } = filter
    const next = { ...DEFAULT_FILTER, ...rest }
    if (!isRandomStudyMode(next)) {
      setStudyRandomExams(null)
    }
    if (startId && !next.year) {
      const target = allExams.find(e => e.id === startId)
      if (target) next.year = target.year
    }
    setStudyStartExamId(startId ?? null)
    setStudyFilter(next)
    setStudyReturnScreen(returnTo)
    setScreen('study')
  }

  const openRandomStudy = (count = 40) => {
    const total = Math.min(count, allExams.length)
    if (total < 1) return
    const set = buildWeightedRandomExamSet(allExams, {
      total,
      maxPerYear: maxPerYearForRandomCount(total),
    })
    if (set.length === 0) return
    setStudyRandomExams(set)
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
      'exam'
    )
  }

  const openPastExamStudy = year => {
    setStudyPastExamExams(null)
    setStudyPastExamRound(null)
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
      'exam'
    )
  }

  const retryPastExamWrong = (wrongExamIds, year, roundNo) => {
    const subset = sortExams(
      allExams.filter(e => wrongExamIds.includes(e.id)),
      'number'
    )
    if (subset.length === 0) return
    setStudyPastExamExams(subset)
    setStudyPastExamRound(roundNo ?? null)
    setStudyStartExamId(null)
    setStudyFilter({
      ...DEFAULT_FILTER,
      mode: 'pastExam',
      category: null,
      subcategory: null,
      year,
      examId: null,
      status: 'all',
      sort: 'number',
    })
    setStudyReturnScreen('exam')
    setScreen('study')
  }

  const regenerateRandomStudy = () => {
    const count = getRandomExamCount(studyFilter)
    const total = Math.min(count, allExams.length)
    const set = buildWeightedRandomExamSet(allExams, {
      total,
      maxPerYear: maxPerYearForRandomCount(total),
    })
    if (set.length === 0) return
    setStudyRandomExams(set)
    setStudyStartExamId(null)
  }

  const goTab = (next) => {
    setTab(next)
    if (screen === 'study') {
      setStudyStartExamId(null)
      setStudyRandomExams(null)
      setStudyPastExamExams(null)
      setStudyPastExamRound(null)
    }
    setScreen(next)
  }

  if (screen === 'wrongnotes') {
    return (
      <WrongNotes
        exams={wrongExams}
        progress={progress}
        onUpdateProgress={updateProgress}
        onBack={() => {
          setScreen('home')
          setTab('home')
        }}
      />
    )
  }

  return (
    <>
      <AuthBar appearance={appearance} onAppearanceChange={setAppearance} />
      {screen === 'study' ? (
        <StudyMode
          key={
            studyFilter.mode === 'pastExam'
              ? `past-${studyPastExamExams?.map(e => e.id).join(',') ?? `y${studyFilter.year}`}`
              : isRandomStudyMode(studyFilter)
                ? `random-${studyFilter.randomCount ?? 40}-${studyRandomExams?.map(e => e.id).join(',') ?? 'new'}`
                : 'study'
          }
          exams={getStudyExams}
          startExamId={studyStartExamId}
          isPastExamRetry={Boolean(studyPastExamExams?.length)}
          progress={progress}
          filter={studyFilter}
          allExams={allExams}
          onUpdateProgress={updateProgress}
          onLogItemAttempt={logItemAttempt}
          onClearItemAttempts={clearItemAttempts}
          onRemoveItemAttempt={removeItemAttempt}
          savedNotes={notes}
          onToggleNote={toggleStudyNote}
          onBack={() => {
            setStudyStartExamId(null)
            setStudyRandomExams(null)
            setStudyPastExamExams(null)
            setStudyPastExamRound(null)
            setScreen(studyReturnScreen)
          }}
          onRetryPastExamWrong={retryPastExamWrong}
          pastExamRetryRound={studyPastExamRound}
          onFilterChange={setStudyFilter}
          onRegenerateRandom={isRandomStudyMode(studyFilter) ? regenerateRandomStudy : undefined}
          exitLabel={studyReturnScreen === 'exam' ? '시험으로' : '홈으로'}
        />
      ) : screen === 'exam' ? (
        <ExamScreen
          exams={allExams}
          onStartPastExam={openPastExamStudy}
          onStartRandom={openRandomStudy}
        />
      ) : screen === 'index' ? (
        <IndexScreen
          exams={allExams}
          onOpenQuestion={(exam, term) => {
            openStudy({ examId: exam.id, highlightTerm: term ?? null }, 'index')
          }}
        />
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
      ) : (
        <HomeScreen
          exams={allExams}
          progress={progress}
          onStartStudy={({ category, subcategory }) => {
            openStudy({ category, subcategory, year: null, examId: null }, 'home')
          }}
          onStartStudyByYear={(year) => {
            openStudy({ category: null, year, examId: null }, 'home')
          }}
        />
      )}
      <BottomNav
        active={screen === 'study' ? studyReturnScreen : tab}
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
