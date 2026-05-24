import taxonomy from '../../data/taxonomy.json'
import { CATEGORIES, categorySortIndex } from './categoryStyles'

const PART_ORDER = ['제1편 총칙', '제2편 물권', '제3편 채권', '민사특별법']

const PART_META = {
  '제1편 총칙': { label: '제1편 총칙', hex: '#3b82f6', light: 'bg-blue-50', text: 'text-blue-700' },
  '제2편 물권': { label: '제2편 물권', hex: '#10b981', light: 'bg-emerald-50', text: 'text-emerald-700' },
  '제3편 채권': { label: '제3편 채권', hex: '#f59e0b', light: 'bg-amber-50', text: 'text-amber-700' },
  민사특별법: { label: '민사특별법', hex: '#f43f5e', light: 'bg-rose-50', text: 'text-rose-700' },
  기타: { label: '기타', hex: '#94a3b8', light: 'bg-slate-50', text: 'text-slate-600' },
}

const CATEGORY_HEX = {
  'bg-blue-500': '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-slate-500': '#64748b',
  'bg-teal-500': '#14b8a6',
  'bg-yellow-500': '#eab308',
  'bg-red-500': '#ef4444',
  'bg-indigo-500': '#6366f1',
  'bg-pink-500': '#ec4899',
  'bg-cyan-500': '#06b6d4',
  'bg-sky-500': '#0ea5e9',
  'bg-amber-500': '#f59e0b',
  'bg-lime-500': '#84cc16',
  'bg-violet-500': '#8b5cf6',
  'bg-rose-500': '#f43f5e',
}

const categoryToPart = Object.fromEntries(taxonomy.units.map(u => [u.category, u.part]))

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

  const categoryRows = CATEGORIES.map(cat => {
    const count = exams.filter(e => e.category === cat.name).length
    return {
      name: cat.name,
      count,
      pct: pct(count, total),
      icon: cat.icon,
      barClass: cat.color,
      hex: CATEGORY_HEX[cat.color] ?? '#64748b',
      part: categoryToPart[cat.name] ?? '기타',
    }
  })
    .filter(row => row.count > 0)
    .sort((a, b) => categorySortIndex(a.name) - categorySortIndex(b.name))

  const partMap = new Map()
  for (const row of categoryRows) {
    const part = row.part
    if (!partMap.has(part)) partMap.set(part, { part, count: 0, categories: [] })
    const entry = partMap.get(part)
    entry.count += row.count
    entry.categories.push(row.name)
  }

  const partRows = [...partMap.values()]
    .map(row => ({
      ...row,
      pct: pct(row.count, total),
      meta: PART_META[row.part] ?? PART_META.기타,
      hex: (PART_META[row.part] ?? PART_META.기타).hex,
    }))
    .sort((a, b) => {
      const ai = PART_ORDER.indexOf(a.part)
      const bi = PART_ORDER.indexOf(b.part)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  const subcategoryMap = new Map()
  for (const exam of exams) {
    const key = exam.subcategory || '미분류'
    if (!subcategoryMap.has(key)) subcategoryMap.set(key, { name: key, category: exam.category, count: 0 })
    subcategoryMap.get(key).count += 1
  }

  const subcategoryRows = [...subcategoryMap.values()].sort(
    (a, b) => b.count - a.count || categorySortIndex(a.category) - categorySortIndex(b.category)
  )

  const yearMatrix = years.map(year => {
    const yearExams = exams.filter(e => e.year === year)
    const byCat = Object.fromEntries(
      categoryRows.map(row => [row.name, yearExams.filter(e => e.category === row.name).length])
    )
    return { year, round: yearExams[0]?.round, total: yearExams.length, byCat }
  })

  const maxYearCell = Math.max(1, ...yearMatrix.flatMap(row => categoryRows.map(cat => row.byCat[cat.name] ?? 0)))

  const topCategory = categoryRows.reduce((best, row) => (row.count > (best?.count ?? 0) ? row : best), null)

  return {
    total,
    years,
    examCount,
    avgPerYear,
    categoryRows,
    partRows,
    subcategoryRows,
    yearMatrix,
    maxYearCell,
    topCategory,
    donutGradient: buildConicGradient(partRows),
  }
}

export { PART_META }
