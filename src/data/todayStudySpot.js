import { getChapterShortLabel, getChapterById, filterExamsByChapter } from './curriculum'
import { isExamComplete } from './loadExam'

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

  if (filter?.chapterId) {

    const chapter = getChapterShortLabel(filter.chapterId)

    if (filter.subcategory) return `${chapter} · ${filter.subcategory}`

    return chapter ?? '목차'

  }

  if (filter?.subcategory) return `${filter.category} · ${filter.subcategory}`

  if (filter?.category) return filter.category

  if (exam?.category) return exam.category

  return '학습'

}



export function getTodayStudySpotKind(filter) {

  if (filter?.mode === 'pastExam' || filter?.mode === 'random') return null

  if (filter?.chapterId || filter?.category || filter?.subcategory) return 'category'

  if (filter?.year) return 'year'

  return null

}



/** @returns {'year' | 'category' | null} */
export function getWrongNoteKind(filter) {
  return getTodayStudySpotKind(filter)
}



function buildSpotRecord({ filter, exam, position, total }) {

  return {

    label: buildTodayStudySpotLabel(filter, exam),

    questionNo: exam.question_no,

    position,

    total,

    examId: exam.id,

    filter: {

      mode: filter?.mode ?? null,

      chapterId: filter?.chapterId ?? null,

      category: filter?.category ?? null,

      subcategory: filter?.subcategory ?? null,

      year: filter?.year ?? null,

      status: filter?.status ?? 'all',

      sort: filter?.sort ?? 'number',

    },

    updatedAt: Date.now(),

  }

}



function normalizeSpot(raw) {

  if (!raw?.examId || !raw?.position || !raw?.total) return null

  return raw

}



function readStoredSpots() {

  try {

    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    return JSON.parse(raw)

  } catch {

    return null

  }

}



export function saveTodayStudySpot({

  filter,

  exam,

  position,

  total,

}) {

  const kind = getTodayStudySpotKind(filter)

  if (!kind || !exam || !total) return

  try {

    const dateKey = localDateKey()

    const stored = readStoredSpots()

    const next = {

      dateKey,

      year: null,

      category: null,

    }



    if (stored?.dateKey === dateKey) {

      if (stored.year || stored.category) {

        next.year = stored.year ?? null

        next.category = stored.category ?? null

      } else if (stored.examId) {

        const legacyKind = stored.filter?.year ? 'year' : 'category'

        if (legacyKind === 'year') next.year = stored

        else if (legacyKind === 'category') next.category = stored

      }

    }



    next[kind] = buildSpotRecord({ filter, exam, position, total })

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

  } catch {

    /* ignore quota */

  }

}



export function loadTodayStudySpots() {

  const empty = { year: null, category: null }

  try {

    const data = readStoredSpots()

    if (!data || data.dateKey !== localDateKey()) return empty



    if (data.year || data.category) {

      return {

        year: normalizeSpot(data.year),

        category: normalizeSpot(data.category),

      }

    }



    const legacy = normalizeSpot(data)

    if (!legacy) return empty

    const legacyKind = legacy.filter?.year ? 'year' : 'category'

    if (legacyKind === 'year') return { year: legacy, category: null }

    if (legacyKind === 'category') return { year: null, category: legacy }

    return empty

  } catch {

    return empty

  }

}



/** @deprecated use loadTodayStudySpots */

export function loadTodayStudySpot() {

  const spots = loadTodayStudySpots()

  return spots.year ?? spots.category

}



function countAnsweredForSpot(spot, exams, progress) {
  const filter = spot.filter ?? {}
  if (filter.year) {
    return exams.filter(q => q.year === filter.year && isExamComplete(progress, q.id)).length
  }
  if (filter.chapterId) {
    const chapter = getChapterById(filter.chapterId)
    if (!chapter) return spot.position
    let list = filterExamsByChapter(exams, chapter)
    if (filter.category) {
      list = list.filter(e => e.category === filter.category)
    }
    if (filter.subcategory) {
      list = list.filter(e => e.subcategory === filter.subcategory)
    }
    return list.filter(q => isExamComplete(progress, q.id)).length
  }
  return spot.position
}

export function formatTodayStudySpot(spot, exams, progress) {
  if (!spot) return null
  const answered =
    exams && progress ? countAnsweredForSpot(spot, exams, progress) : spot.position
  return `${spot.label} ${spot.questionNo}번 · ${answered}/${spot.total} 진행`
}

