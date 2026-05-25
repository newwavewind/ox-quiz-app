import { useState, useEffect, useMemo, useCallback } from 'react'
import HomeScreen from './components/HomeScreen'
import IndexScreen from './components/IndexScreen'
import NotesScreen from './components/NotesScreen'
import CommunityScreen from './components/CommunityScreen'
import AuthBar from './components/AuthBar'
import { useAuth } from './contexts/AuthContext'
import { loadCommunityPosts, saveCommunityPosts } from './data/communityPosts'
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
import { buildStudyNote, makeNoteId } from './data/studyNotes'
import {
  applyAppearanceSettings,
  loadAppearanceSettings,
  saveAppearanceSettings,
} from './data/appearanceSettings'

const STORAGE_KEY = 'ox_quiz_progress_v2'
const NOTES_STORAGE_KEY = 'ox_quiz_notes_v1'

const DEFAULT_FILTER = {
  category: null,
  subcategory: null,
  year: null,
  examId: null,
  status: 'all',
  sort: 'number',
  highlightTerm: null,
}

function App() {
  const { user, isConfigured } = useAuth()
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState('home')
  const [studyReturnScreen, setStudyReturnScreen] = useState('home')
  const [studyFilter, setStudyFilter] = useState({ ...DEFAULT_FILTER })
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
      if (user) {
        const saved = await insertCommunityPost(user.id, post)
        if (saved) {
          setCommunityPosts(prev => [saved, ...prev])
          return
        }
      }
      setCommunityPosts(prev => [post, ...prev])
    },
    [user],
  )

  const deleteCommunityPost = useCallback(
    async postId => {
      if (user && isCloudPostId(postId)) {
        const ok = await deleteCloudPost(postId)
        if (!ok) return
      }
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
  }, [studyFilter, progress])

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
    if (startId && !next.year) {
      const target = allExams.find(e => e.id === startId)
      if (target) next.year = target.year
    }
    setStudyStartExamId(startId ?? null)
    setStudyFilter(next)
    setStudyReturnScreen(returnTo)
    setScreen('study')
  }

  const goTab = (next) => {
    setTab(next)
    if (screen === 'study') {
      setStudyStartExamId(null)
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
      <AuthBar />
      {screen === 'study' ? (
        <StudyMode
          exams={getStudyExams}
          startExamId={studyStartExamId}
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
            setScreen(studyReturnScreen)
          }}
          onFilterChange={setStudyFilter}
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
          appearance={appearance}
          onAppearanceChange={setAppearance}
          onStartStudy={({ category, subcategory }) => {
            openStudy({ category, subcategory, year: null, examId: null }, 'home')
          }}
          onStartStudyByYear={(year) => {
            openStudy({ category: null, year, examId: null }, 'home')
          }}
        />
      )}
      <BottomNav
        active={screen === 'study' ? 'home' : tab}
        onHome={() => goTab('home')}
        onIndex={() => goTab('index')}
        onNotes={() => goTab('notes')}
        onCommunity={() => goTab('community')}
      />
    </>
  )
}

export default App
