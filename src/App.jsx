import { useState, useEffect, useMemo } from 'react'
import HomeScreen from './components/HomeScreen'
import IndexScreen from './components/IndexScreen'
import StatsScreen from './components/StatsScreen'
import StudyMode from './components/StudyMode'
import WrongNotes from './components/WrongNotes'
import BottomNav from './components/BottomNav'
import { allExams, sortExams, isExamComplete, isExamCorrect } from './data/loadExam'

const STORAGE_KEY = 'ox_quiz_progress_v2'

const DEFAULT_FILTER = {
  category: null,
  subcategory: null,
  year: null,
  examId: null,
  status: 'all',
  sort: 'number',
}

function App() {
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState('home')
  const [studyReturnScreen, setStudyReturnScreen] = useState('home')
  const [studyFilter, setStudyFilter] = useState({ ...DEFAULT_FILTER })
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

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

  const resetProgress = () => {
    if (window.confirm('모든 학습 기록을 초기화하시겠습니까?')) {
      setProgress({})
    }
  }

  const getStudyExams = useMemo(() => {
    let filtered = [...allExams]
    if (studyFilter.examId) {
      filtered = filtered.filter(q => q.id === studyFilter.examId)
    }
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
    setStudyFilter({ ...DEFAULT_FILTER, ...filter })
    setStudyReturnScreen(returnTo)
    setScreen('study')
  }

  const goTab = (next) => {
    setTab(next)
    if (screen !== 'study') {
      setScreen(next)
    }
  }

  if (screen === 'study') {
    return (
      <StudyMode
        exams={getStudyExams}
        progress={progress}
        filter={studyFilter}
        allExams={allExams}
        onUpdateProgress={updateProgress}
        onBack={() => setScreen(studyReturnScreen)}
        onFilterChange={setStudyFilter}
      />
    )
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
      {screen === 'index' ? (
        <IndexScreen
          exams={allExams}
          onOpenQuestion={(exam) => {
            openStudy({ examId: exam.id }, 'index')
          }}
        />
      ) : screen === 'stats' ? (
        <StatsScreen
          exams={allExams}
          onStartStudy={({ category, subcategory }) => {
            openStudy({ category, subcategory, year: null, examId: null }, 'stats')
          }}
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
          onStartAll={() => {
            openStudy({ category: null, year: null, examId: null }, 'home')
          }}
          onViewWrongNotes={() => setScreen('wrongnotes')}
          onResetProgress={resetProgress}
        />
      )}
      <BottomNav
        active={tab}
        onHome={() => goTab('home')}
        onIndex={() => goTab('index')}
        onStats={() => goTab('stats')}
      />
    </>
  )
}

export default App
