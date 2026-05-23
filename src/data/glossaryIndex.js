import taxonomy from '../../data/taxonomy.json'

/** 띄어쓰기 무시 매칭 */
export function normalizeText(text) {
  return (text || '').replace(/\s+/g, '')
}

function examSearchBlob(exam) {
  const parts = [
    exam.stem,
    exam.subcategory,
    exam.category,
    ...(exam.items || []).map(i => i.text),
    ...(exam.items || []).map(i => i.explanation),
  ]
  return normalizeText(parts.filter(Boolean).join('\n'))
}

/** 용어가 포함된 기출 문항 (지문·보기·해설·소분류) */
export function findExamsForTerm(term, exams) {
  const needle = normalizeText(term)
  if (!needle || needle.length < 2) return []
  return exams
    .filter(exam => examSearchBlob(exam).includes(needle))
    .sort((a, b) => a.question_no - b.question_no)
}

function collectTaxonomyTerms() {
  const seen = new Set()
  const list = []
  for (const unit of taxonomy.units) {
    const candidates = [unit.subcategory, ...(unit.keywords || [])]
    for (const raw of candidates) {
      const term = (raw || '').trim()
      if (!term || term.length < 2 || seen.has(term)) continue
      seen.add(term)
      list.push({
        term,
        category: unit.category,
        section: unit.section,
        part: unit.part,
      })
    }
  }
  return list
}

/**
 * @param {import('./loadExam').allExams[number][]} exams
 */
export function buildGlossaryIndex(exams) {
  const byTerm = new Map()

  for (const meta of collectTaxonomyTerms()) {
    const matches = findExamsForTerm(meta.term, exams)
    if (matches.length === 0) continue
    byTerm.set(meta.term, {
      term: meta.term,
      category: meta.category,
      section: meta.section,
      part: meta.part,
      exams: matches,
    })
  }

  for (const exam of exams) {
    if (!exam.subcategory) continue
    const term = exam.subcategory
    if (byTerm.has(term)) {
      const entry = byTerm.get(term)
      const ids = new Set(entry.exams.map(e => e.id))
      if (!ids.has(exam.id)) {
        entry.exams = [...entry.exams, exam].sort((a, b) => a.question_no - b.question_no)
      }
      continue
    }
    const matches = findExamsForTerm(term, exams)
    if (matches.length > 0) {
      byTerm.set(term, {
        term,
        category: exam.category,
        section: null,
        part: null,
        exams: matches,
      })
    }
  }

  return [...byTerm.values()].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category, 'ko')
    return a.term.localeCompare(b.term, 'ko')
  })
}

export function groupGlossaryByCategory(entries) {
  const groups = {}
  for (const entry of entries) {
    if (!groups[entry.category]) groups[entry.category] = []
    groups[entry.category].push(entry)
  }
  return groups
}

export function formatExamRef(exam) {
  return `제${exam.round}회 · ${exam.question_no}번`
}
