const STORAGE_PREFIX = 'ox_study_resume_'

export function saveStudyResume({ storageKey = 'default', examListKey, currentIndex, scrollTop = 0 }) {
  if (!storageKey || !examListKey) return
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${storageKey}`,
      JSON.stringify({
        examListKey,
        currentIndex,
        scrollTop,
        savedAt: Date.now(),
      })
    )
  } catch {
    /* ignore quota */
  }
}

export function loadStudyResume(storageKey = 'default', examListKey) {
  if (!storageKey || !examListKey) return null
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.examListKey !== examListKey) return null
    return data
  } catch {
    return null
  }
}

export function clearStudyResume(storageKey = 'default') {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`)
  } catch {
    /* ignore */
  }
}
