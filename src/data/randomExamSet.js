import { buildExamStats } from './examStats'

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function subcategoryKey(exam) {
  return exam.subcategory || '미분류'
}

function categoryKey(exam) {
  return exam.category || '미분류'
}

function buildWeightMap(allExams, weightKey) {
  const stats = buildExamStats(allExams)
  const rows = weightKey === 'category' ? stats.categoryRows : stats.subcategoryRows
  const map = new Map()
  for (const row of rows) {
    map.set(row.name, Math.max(1, row.count))
  }
  return map
}

function examWeight(exam, weightMap, weightKey) {
  const key = weightKey === 'category' ? categoryKey(exam) : subcategoryKey(exam)
  return weightMap.get(key) ?? 1
}

function weightedSample(pool, total) {
  const selected = []
  const remaining = [...pool]

  while (selected.length < total && remaining.length > 0) {
    let sum = 0
    for (const item of remaining) sum += item.weight
    if (sum <= 0) break

    let r = Math.random() * sum
    let pickIdx = 0
    for (let i = 0; i < remaining.length; i += 1) {
      r -= remaining[i].weight
      if (r <= 0) {
        pickIdx = i
        break
      }
      pickIdx = i
    }

    selected.push(remaining[pickIdx].exam)
    remaining.splice(pickIdx, 1)
  }

  return selected
}

function countByYear(exams) {
  const counts = new Map()
  for (const e of exams) {
    counts.set(e.year, (counts.get(e.year) || 0) + 1)
  }
  return counts
}

function enforceYearCap(selected, allExams, maxPerYear) {
  if (maxPerYear <= 0 || selected.length === 0) return selected

  const selectedIds = new Set(selected.map(e => e.id))
  let result = [...selected]
  const maxAttempts = result.length * 4
  let attempts = 0

  while (attempts < maxAttempts) {
    const byYear = countByYear(result)
    const overYear = [...byYear.entries()].find(([, n]) => n > maxPerYear)?.[0]
    if (overYear == null) break

    const idx = result.findIndex(e => e.year === overYear)
    if (idx < 0) break

    const removed = result[idx]
    const replacement = allExams.find(
      e =>
        !selectedIds.has(e.id) &&
        e.id !== removed.id &&
        (byYear.get(e.year) || 0) < maxPerYear,
    )

    if (!replacement) break

    selectedIds.delete(removed.id)
    selectedIds.add(replacement.id)
    result = [...result]
    result[idx] = replacement
    attempts += 1
  }

  return result
}

export const RANDOM_EXAM_COUNTS = [5, 10, 20, 30, 40]

export function isRandomStudyMode(filter) {
  return filter?.mode === 'random' || filter?.mode === 'random40'
}

export function getRandomExamCount(filter) {
  if (filter?.mode === 'random40') return 40
  return filter?.randomCount ?? 40
}

export function maxPerYearForRandomCount(count) {
  return Math.max(1, Math.round((count / 40) * 6))
}

export function buildWeightedRandomExamSet(allExams, options = {}) {
  const total = options.total ?? 40
  const maxPerYear = options.maxPerYear ?? maxPerYearForRandomCount(total)
  const { weightKey = 'subcategory' } = options
  const pool = allExams.filter(Boolean)
  if (pool.length === 0) return []

  const take = Math.min(total, pool.length)
  const weightMap = buildWeightMap(pool, weightKey)

  const weightedPool = pool.map(exam => ({
    exam,
    weight: examWeight(exam, weightMap, weightKey),
  }))

  let selected = weightedSample(weightedPool, take)
  selected = enforceYearCap(selected, pool, maxPerYear)
  return shuffleInPlace(selected)
}
