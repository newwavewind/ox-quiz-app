const STORAGE_KEY = 'exam_wrong_notes_v1'

/** @returns {Record<string, { addedAt: number }>} */
export function loadExamWrongNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveExamWrongNotes(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function isExamWrongNote(map, examId) {
  return Boolean(map?.[examId])
}

/** @returns {Record<string, { addedAt: number }>} */
export function addExamWrongNote(map, examId) {
  if (!examId) return map
  const next = {
    ...map,
    [examId]: { addedAt: Date.now() },
  }
  saveExamWrongNotes(next)
  return next
}

/** @returns {Record<string, { addedAt: number }>} */
export function removeExamWrongNote(map, examId) {
  if (!examId || !map?.[examId]) return map
  const next = { ...map }
  delete next[examId]
  saveExamWrongNotes(next)
  return next
}

/** @param {Record<string, { addedAt: number }>} map */
export function sortExamWrongNoteIds(map, order = 'recent') {
  return Object.entries(map)
    .sort(([, a], [, b]) => (order === 'oldest' ? a.addedAt - b.addedAt : b.addedAt - a.addedAt))
    .map(([examId]) => examId)
}
