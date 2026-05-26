const STORAGE_KEY = 'ox_study_resume_v1'

export function saveStudyResume({ examListKey, currentIndex, scrollTop = 0 }) {
  if (!examListKey) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
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

export function loadStudyResume(examListKey) {
  if (!examListKey) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.examListKey !== examListKey) return null
    return data
  } catch {
    return null
  }
}

export function clearStudyResume() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
