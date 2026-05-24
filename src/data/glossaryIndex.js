import taxonomy from '../../data/taxonomy.json'

import { normalizeForMatch, buildTermPattern } from '../utils/highlightText'

/** @deprecated use normalizeForMatch */
export function normalizeText(text) {
  return normalizeForMatch(text)
}

/** 용어집 매칭: 지문·보기·소분류만 (해설 제외 — 다른 단원 용어 언급으로 오매칭 방지) */
function examIndexBlob(exam) {
  const parts = [
    exam.stem,
    exam.subcategory,
    exam.category,
    ...(exam.items || []).map(i => i.text),
  ]
  return normalizeForMatch(parts.filter(Boolean).join('\n'))
}

export function textContainsTerm(text, term) {
  const pattern = buildTermPattern(term)
  if (!pattern || !text) return false
  return new RegExp(pattern, 'i').test(text)
}

export function examMatchesTerm(exam, term) {
  if (!term?.trim() || normalizeForMatch(term).length < 2) return false
  return textContainsTerm(examIndexBlob(exam), term)
}

/** 용어가 지문·보기·소분류 중 어디에 있는지 */
export function getTermMatchInfo(exam, term) {
  if (!term?.trim() || normalizeForMatch(term).length < 2) {
    return { inSubcategory: false, inStem: false, itemLabels: [], inBody: false }
  }
  const inSubcategory = Boolean(exam.subcategory && textContainsTerm(exam.subcategory, term))
  const inStem = textContainsTerm(exam.stem, term)
  const itemLabels = (exam.items || [])
    .filter(i => textContainsTerm(i.text, term))
    .map(i => i.label)
  return {
    inSubcategory,
    inStem,
    itemLabels,
    inBody: inStem || itemLabels.length > 0,
  }
}

/** 용어가 포함된 기출 문항 (지문·보기·소분류) */
export function findExamsForTerm(term, exams) {
  if (!term?.trim() || normalizeForMatch(term).length < 2) return []
  return exams
    .filter(exam => examMatchesTerm(exam, term))
    .sort((a, b) => a.question_no - b.question_no)
}

/** 조문 번호만 있는 키워드(제103조 등)는 용어집 항목에서 제외 */
function isArticleKeyword(term) {
  return /^제\d+조/.test(term.trim())
}

function collectTaxonomyTerms() {
  const seen = new Set()
  const list = []
  for (const unit of taxonomy.units) {
    const candidates = [unit.subcategory, ...(unit.keywords || [])]
    for (const raw of candidates) {
      const term = (raw || '').trim()
      if (!term || term.length < 2 || seen.has(term) || isArticleKeyword(term)) continue
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

  return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term, 'ko'))
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
