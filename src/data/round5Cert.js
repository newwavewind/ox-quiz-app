import {
  loadPastExamRounds,
  PAST_EXAM_ROUND_MAX,
  PAST_EXAM_ROUND_MIN,
} from './pastExamRounds'

const WRITE_INTENT_KEY = 'ox_quiz_round5_cert_intent_v1'

export const ROUND5_CERT_FREE_WRITE_SEPARATOR = '──────────────'

export function isRound5Completed(year) {
  const y = Number(year)
  if (!y) return false
  const rounds = loadPastExamRounds(y)
  return Boolean(rounds[PAST_EXAM_ROUND_MAX]?.completed)
}

/** @param {number[]} years */
export function getRound5CertEligibleYears(years) {
  return years.filter(y => isRound5Completed(y))
}

export function getRound5Record(year) {
  return loadPastExamRounds(Number(year))[PAST_EXAM_ROUND_MAX] ?? null
}

function formatRoundStatus(rec) {
  if (rec.passed) return '합격'
  if (rec.hasGwakjak) return '과락'
  return '불합격'
}

function formatRoundScoreLine(roundNo, rec) {
  if (!rec?.completed) return `· ${roundNo}회독: (미완료)`
  const scoreLine =
    rec.score != null ? `${rec.score}점` : `${rec.questionCorrect}/${rec.questionTotal} 정답`
  const status = formatRoundStatus(rec)
  const date = rec.completedAt
    ? new Date(rec.completedAt).toLocaleDateString('ko-KR')
    : null
  return date
    ? `· ${roundNo}회독: ${scoreLine} (${status}) — ${date}`
    : `· ${roundNo}회독: ${scoreLine} (${status})`
}

export function buildRoundScoresAutoText(year) {
  const y = Number(year)
  const rounds = loadPastExamRounds(y)
  const lines = [`${y}년 기출 회독별 채점`, '']
  for (let n = PAST_EXAM_ROUND_MIN; n <= PAST_EXAM_ROUND_MAX; n++) {
    lines.push(formatRoundScoreLine(n, rounds[n]))
  }
  return lines.join('\n')
}

function looksLikeAutoBlock(plain) {
  return /^\d{4}년 기출 회독별 채점/.test(plain.trim())
}

/** @param {number} year @param {string} [existingPlain] */
export function composeRound5CertContent(year, existingPlain = '') {
  const autoBlock = buildRoundScoresAutoText(year)
  const sep = ROUND5_CERT_FREE_WRITE_SEPARATOR
  const plain = existingPlain.trim()

  let freePart = ''
  const sepIdx = plain.indexOf(sep)
  if (sepIdx >= 0) {
    freePart = plain.slice(sepIdx + sep.length).trim()
  } else if (plain && !looksLikeAutoBlock(plain)) {
    freePart = plain
  }

  return freePart
    ? `${autoBlock}\n\n${sep}\n\n${freePart}`
    : `${autoBlock}\n\n${sep}\n\n`
}

export function buildRound5CertDraft(year) {
  const y = Number(year)
  if (!isRound5Completed(y)) return null

  return {
    board: 'round5_cert',
    certYear: y,
    title: `${y}년 5회독 완료 인증`,
    content: composeRound5CertContent(y),
  }
}

export function saveRound5CertWriteIntent(year) {
  try {
    sessionStorage.setItem(
      WRITE_INTENT_KEY,
      JSON.stringify({ year: Number(year), at: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

export function consumeRound5CertWriteIntent() {
  try {
    const raw = sessionStorage.getItem(WRITE_INTENT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(WRITE_INTENT_KEY)
    const parsed = JSON.parse(raw)
    if (!parsed?.year) return null
    return buildRound5CertDraft(parsed.year)
  } catch {
    return null
  }
}

export function plainTextToEditorHtml(text) {
  if (!text) return ''
  return text
    .split('\n')
    .map(line => (line ? line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<br>'))
    .join('<br>')
}
