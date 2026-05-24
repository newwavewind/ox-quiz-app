/** @typedef {{ at: number, pick: 'O' | 'X', correct: boolean }} ItemAttempt */

/**
 * @param {Record<string, unknown>} progress
 * @param {string} examId
 * @param {string} itemKey
 * @returns {ItemAttempt[]}
 */
export function getItemAttempts(progress, examId, itemKey) {
  const list = progress[examId]?.itemAttempts?.[itemKey]
  return Array.isArray(list) ? list : []
}

export function formatStudyTime(timestamp) {
  const d = new Date(timestamp)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
}
