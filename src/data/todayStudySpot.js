const STORAGE_KEY = 'ox_today_study_spot_v1'

export function localDateKey(ts = Date.now()) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** @param {import('./loadExam').ExamQuestion} exam */
export function buildTodayStudySpotLabel(filter, exam) {
  if (filter?.year) return `${filter.year}년`
  if (filter?.subcategory) return `${filter.category} · ${filter.subcategory}`
  if (filter?.category) return filter.category
  if (exam?.category) return exam.category
  return '학습'
}

export function saveTodayStudySpot({
  filter,
  exam,
  position,
  total,
}) {
  if (!exam || !total) return
  try {
    const payload = {
      dateKey: localDateKey(),
      label: buildTodayStudySpotLabel(filter, exam),
      questionNo: exam.question_no,
      position,
      total,
      examId: exam.id,
      filter: {
        mode: filter?.mode ?? null,
        category: filter?.category ?? null,
        subcategory: filter?.subcategory ?? null,
        year: filter?.year ?? null,
        status: filter?.status ?? 'all',
        sort: filter?.sort ?? 'number',
      },
      updatedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function loadTodayStudySpot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || data.dateKey !== localDateKey()) return null
    if (!data.examId || !data.position || !data.total) return null
    return data
  } catch {
    return null
  }
}

export function formatTodayStudySpot(spot) {
  if (!spot) return null
  return `${spot.label} ${spot.questionNo}번 · ${spot.position}/${spot.total} 진행`
}
