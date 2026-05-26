const STORAGE_PREFIX = 'past_exam_rounds_v1_'

/** @type {((data: Record<string, Record<number, unknown>>) => void) | null} */
let cloudSyncCallback = null

export function setPastExamRoundsSyncCallback(fn) {
  cloudSyncCallback = fn
}

function storageKey(year) {
  return `${STORAGE_PREFIX}${year}`
}

function notifyCloudSync() {
  if (cloudSyncCallback) cloudSyncCallback(exportAllPastExamRounds())
}

/** @param {number[] | null} years */
export function exportAllPastExamRounds(years = null) {
  const out = {}
  if (years?.length) {
    for (const year of years) {
      const rounds = loadPastExamRounds(year)
      if (Object.keys(rounds).length > 0) out[String(year)] = rounds
    }
    return out
  }
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    const year = key.slice(STORAGE_PREFIX.length)
    const rounds = loadPastExamRounds(Number(year))
    if (Object.keys(rounds).length > 0) out[year] = rounds
  }
  return out
}

/** @param {Record<string, Record<number, unknown>> | null | undefined} cloudData */
export function mergeCloudPastExamRounds(cloudData, years = []) {
  if (!cloudData || typeof cloudData !== 'object') return
  for (const year of years) {
    const key = String(year)
    const remote = cloudData[key]
    if (!remote || typeof remote !== 'object') continue
    const local = loadPastExamRounds(year)
    const merged = { ...local }
    for (const [roundNo, rec] of Object.entries(remote)) {
      const n = Number(roundNo)
      if (!rec || typeof rec !== 'object') continue
      const localRec = merged[n]
      const remoteAt = rec.completedAt ?? 0
      const localAt = localRec?.completedAt ?? 0
      if (!localRec?.completed || remoteAt >= localAt) {
        merged[n] = rec
      }
    }
    localStorage.setItem(storageKey(year), JSON.stringify({ rounds: merged }))
  }
}

/** @returns {Record<number, { completed: boolean, questionCorrect: number, questionTotal: number, wrongCount: number, completedAt: number }>} */
export function loadPastExamRounds(year) {
  try {
    const raw = localStorage.getItem(storageKey(year))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed?.rounds ?? {}
  } catch {
    return {}
  }
}

export function savePastExamRoundResult(
  year,
  roundNo,
  { questionCorrect, questionTotal, results = null, score = null, passed = null, hasGwakjak = null }
) {
  const rounds = loadPastExamRounds(year)
  const wrongCount = questionTotal - questionCorrect
  rounds[roundNo] = {
    completed: true,
    questionCorrect,
    questionTotal,
    wrongCount,
    score,
    passed,
    hasGwakjak,
    completedAt: Date.now(),
    results,
  }
  localStorage.setItem(storageKey(year), JSON.stringify({ rounds }))
  notifyCloudSync()
  return rounds
}

export function clearPastExamRound(year, roundNo) {
  const rounds = loadPastExamRounds(year)
  delete rounds[roundNo]
  localStorage.setItem(storageKey(year), JSON.stringify({ rounds }))
  notifyCloudSync()
  return rounds
}

export const PAST_EXAM_ROUND_MIN = 1
export const PAST_EXAM_ROUND_MAX = 5
export const PAST_EXAM_INFINITE_ROUND = 'infinite'

export function isPastExamInfiniteRound(roundNo) {
  return roundNo === PAST_EXAM_INFINITE_ROUND
}

export function isValidPastExamRound(roundNo) {
  return roundNo >= PAST_EXAM_ROUND_MIN && roundNo <= PAST_EXAM_ROUND_MAX
}

export function isPastExamPlayableRound(roundNo) {
  return isValidPastExamRound(roundNo) || isPastExamInfiniteRound(roundNo)
}

export function formatPastExamRoundLabel(roundNo) {
  if (isPastExamInfiniteRound(roundNo)) return '회독무한반복'
  if (isValidPastExamRound(roundNo)) return `${roundNo}회독`
  return String(roundNo ?? '')
}

/** 5회독 완료 후에만 회독무한반복 시작 가능 */
export function getPastExamInfiniteBlockMessage(roundsData = {}) {
  if (!roundsData[PAST_EXAM_ROUND_MAX]?.completed) return '5회독을 먼저 완료하세요'
  return null
}

/** 이전 회독 미완료 시 표시할 안내 문구. 시작 가능하면 null */
export function getPastExamRoundBlockMessage(roundNo, roundsData = {}) {
  if (roundNo <= PAST_EXAM_ROUND_MIN) return null
  const missing = []
  for (let i = PAST_EXAM_ROUND_MIN; i < roundNo; i++) {
    if (!roundsData[i]?.completed) missing.push(i)
  }
  if (missing.length === 0) return null
  if (missing.length === 1) return `${missing[0]}회독을 먼저 하세요`
  return `${missing.map(n => `${n}회독`).join(' ')}을 먼저 하세요`
}
