/** 2026년 제37회 공인중개사 자격시험 (1·2차 동시, Q-net 사전공고 기준) */
export const BROKER_EXAM = {
  round: 37,
  year: 2026,
  /** YYYY-MM-DD (KST 달력 기준) */
  date: '2026-10-31',
  weekday: '토',
}

function startOfLocalDay(value) {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 시험일 00:00 기준 남은 일수 (당일=0, 이후=음수) */
export function getBrokerExamDday(now = new Date()) {
  const exam = startOfLocalDay(BROKER_EXAM.date)
  const today = startOfLocalDay(now)
  const diffMs = exam.getTime() - today.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

export function formatBrokerExamDday(now = new Date()) {
  const days = getBrokerExamDday(now)
  if (days > 0) return `D-${days}`
  if (days === 0) return 'D-Day'
  return `D+${Math.abs(days)}`
}

export function getBrokerExamDdayInfo(now = new Date()) {
  const days = getBrokerExamDday(now)
  const [y, m, d] = BROKER_EXAM.date.split('-')
  return {
    days,
    ddayLabel: formatBrokerExamDday(now),
    roundLabel: `제${BROKER_EXAM.round}회`,
    examDateLabel: `${y.slice(2)}.${m}.${d}.(${BROKER_EXAM.weekday})`,
    title: '공인중개사 시험',
  }
}
