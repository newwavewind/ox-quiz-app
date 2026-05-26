import { isExamComplete } from './loadExam'
import {
  loadPastExamRounds,
  PAST_EXAM_ROUND_MAX,
  PAST_EXAM_ROUND_MIN,
} from './pastExamRounds'

function startOfDay(ts = Date.now()) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfWeek(ts = Date.now()) {
  const d = new Date(ts)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function countTodayOxAttempts(progress) {
  const from = startOfDay()
  let count = 0
  for (const rec of Object.values(progress || {})) {
    const items = rec?.itemAttempts
    if (!items) continue
    for (const list of Object.values(items)) {
      if (!Array.isArray(list)) continue
      for (const a of list) {
        if (a.at >= from) count++
      }
    }
  }
  return count
}

export function countTodayAnsweredExams(progress) {
  const from = startOfDay()
  let count = 0
  for (const rec of Object.values(progress || {})) {
    if (rec?.lastAnswered >= from && rec?.answered) count++
  }
  return count
}

export function countWeekPastExamRounds(years) {
  const from = startOfWeek()
  let completed = 0
  for (const year of years) {
    const rounds = loadPastExamRounds(year)
    for (let r = PAST_EXAM_ROUND_MIN; r <= PAST_EXAM_ROUND_MAX; r++) {
      const rec = rounds[r]
      if (rec?.completed && rec.completedAt >= from) completed++
    }
  }
  return completed
}

export function findNextStudyRecommendation(exams, progress) {
  const bySub = new Map()
  for (const exam of exams) {
    if (isExamComplete(progress, exam.id)) continue
    const key = `${exam.category}::${exam.subcategory || '미분류'}`
    bySub.set(key, (bySub.get(key) || 0) + 1)
  }
  let best = null
  let bestCount = 0
  for (const [key, count] of bySub) {
    if (count > bestCount) {
      bestCount = count
      const [category, sub] = key.split('::')
      best = { category, subcategory: sub === '미분류' ? null : sub, count }
    }
  }
  return best
}

export function buildTodayDashboard(exams, progress, notes, years) {
  const todayOx = countTodayOxAttempts(progress)
  const todayExams = countTodayAnsweredExams(progress)
  const weekRounds = countWeekPastExamRounds(years)
  const noteCount = Object.keys(notes || {}).length
  const recommendation = findNextStudyRecommendation(exams, progress)
  return {
    todayOx,
    todayExams,
    weekRounds,
    noteCount,
    recommendation,
  }
}
