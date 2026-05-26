import { CURRICULUM, getAllChapters, getChapterById, filterExamsByChapter, PART_STYLES } from './curriculum'

const PART_HEX = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
}

export const PART_META = Object.fromEntries(
  CURRICULUM.parts.map(p => [
    p.id,
    {
      label: p.label,
      shortLabel: p.shortLabel,
      hex: PART_HEX[p.style] ?? '#64748b',
      light: PART_STYLES[p.style]?.light ?? 'bg-slate-50',
      text: PART_STYLES[p.style]?.text ?? 'text-slate-600',
    },
  ])
)

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0
}

function buildConicGradient(segments) {
  let acc = 0
  const stops = segments.map(seg => {
    const start = acc
    acc += seg.pct
    return `${seg.hex} ${start}% ${acc}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function buildExamStats(exams) {
  const total = exams.length
  const years = [...new Set(exams.map(e => e.year))].sort((a, b) => b - a)
  const examCount = years.length
  const avgPerYear = examCount > 0 ? Math.round((total / examCount) * 10) / 10 : 0

  const chapterRows = getAllChapters().map(ch => {
    const matched = filterExamsByChapter(exams, ch)
    const partMeta = PART_META[ch.partId] ?? PART_META.part1
    return {
      id: ch.id,
      name: ch.shortLabel,
      fullLabel: ch.label,
      count: matched.length,
      pct: pct(matched.length, total),
      partId: ch.partId,
      partLabel: ch.partLabel,
      hex: partMeta.hex,
      barClass: partMeta.light,
      textClass: partMeta.text,
    }
  })

  const partRows = CURRICULUM.parts.map(part => {
    const partChapters = chapterRows.filter(c => c.partId === part.id)
    const count = partChapters.reduce((sum, c) => sum + c.count, 0)
    const meta = PART_META[part.id] ?? PART_META.part1
    return {
      part: part.id,
      label: part.label,
      count,
      pct: pct(count, total),
      meta,
      hex: meta.hex,
      chapters: partChapters.filter(c => c.count > 0).map(c => c.name),
    }
  }).filter(row => row.count > 0)

  const subcategoryMap = new Map()
  for (const exam of exams) {
    const key = exam.subcategory || '미분류'
    if (!subcategoryMap.has(key)) {
      subcategoryMap.set(key, { name: key, category: exam.category, count: 0 })
    }
    subcategoryMap.get(key).count += 1
  }

  const subcategoryRows = [...subcategoryMap.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko')
  )

  const activeChapterRows = chapterRows.filter(row => row.count > 0)

  const yearMatrix = years.map(year => {
    const yearExams = exams.filter(e => e.year === year)
    const byChapter = Object.fromEntries(
      activeChapterRows.map(row => {
        const ch = getChapterById(row.id)
        return [row.id, ch ? filterExamsByChapter(yearExams, ch).length : 0]
      })
    )
    return { year, round: yearExams[0]?.round, total: yearExams.length, byChapter }
  })

  const maxYearCell = Math.max(
    1,
    ...yearMatrix.flatMap(row => activeChapterRows.map(ch => row.byChapter[ch.id] ?? 0))
  )

  const topChapter = activeChapterRows.reduce(
    (best, row) => (row.count > (best?.count ?? 0) ? row : best),
    null
  )

  return {
    total,
    years,
    examCount,
    avgPerYear,
    chapterRows: activeChapterRows,
    categoryRows: activeChapterRows,
    partRows,
    subcategoryRows,
    yearMatrix,
    maxYearCell,
    topCategory: topChapter
      ? { name: topChapter.name, count: topChapter.count, pct: topChapter.pct, icon: '📘' }
      : null,
    topChapter,
    donutGradient: buildConicGradient(partRows),
  }
}
