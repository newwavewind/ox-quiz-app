import { loadTodayStudySpots } from './todayStudySpot'

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

export function buildTodayDashboard(progress) {
  const todayOx = countTodayOxAttempts(progress)
  const todayExams = countTodayAnsweredExams(progress)
  const todaySpots = loadTodayStudySpots()
  return {
    todayOx,
    todayExams,
    todaySpots,
  }
}
