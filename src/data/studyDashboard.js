import { isExamComplete } from './loadExam'
import { loadTodayStudySpot } from './todayStudySpot'

function startOfDay(ts = Date.now()) {
  const d = new Date(ts)
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

export function buildTodayDashboard(exams, progress, notes) {
  const todayOx = countTodayOxAttempts(progress)
  const todayExams = countTodayAnsweredExams(progress)
  const noteCount = Object.keys(notes || {}).length
  const recommendation = findNextStudyRecommendation(exams, progress)
  const todaySpot = loadTodayStudySpot()
  return {
    todayOx,
    todayExams,
    noteCount,
    recommendation,
    todaySpot,
  }
}
