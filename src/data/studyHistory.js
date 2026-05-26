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

/** 보기별 OX 확인 횟수 중 최솟값 = 문항 전체 회독 횟수 */
export function countExamStudyRoundAttempts(progress, exam) {
  if (!exam?.items?.length) return 0
  let min = Infinity
  for (const item of exam.items) {
    const n = getItemAttempts(progress, exam.id, item.key).length
    min = Math.min(min, n)
  }
  return Number.isFinite(min) ? min : 0
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
