import curriculum from '../../data/curriculum.json'

export const CURRICULUM = curriculum

export const PART_STYLES = {
  blue: {
    light: 'bg-blue-50/8 dark:bg-blue-950/[0.03]',
    border: 'border-blue-100/50 dark:border-blue-800/15',
    text: 'text-blue-700 dark:text-blue-300',
    header: 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/60',
  },
  emerald: {
    light: 'bg-emerald-50/8 dark:bg-emerald-950/[0.03]',
    border: 'border-emerald-100/50 dark:border-emerald-800/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    header: 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/60',
  },
  amber: {
    light: 'bg-amber-50/8 dark:bg-amber-950/[0.03]',
    border: 'border-amber-100/50 dark:border-amber-800/15',
    text: 'text-amber-800 dark:text-amber-300',
    header: 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-800/60',
  },
  rose: {
    light: 'bg-rose-50/8 dark:bg-rose-950/[0.03]',
    border: 'border-rose-100/50 dark:border-rose-800/15',
    text: 'text-rose-700 dark:text-rose-300',
    header: 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800/60',
  },
}

const chapterIndex = new Map()
const partIndex = new Map()

for (const part of curriculum.parts) {
  partIndex.set(part.id, part)
  for (const chapter of part.chapters) {
    chapterIndex.set(chapter.id, { ...chapter, partId: part.id, partLabel: part.label, partStyle: part.style })
  }
}

export function getPartById(partId) {
  return partIndex.get(partId) ?? null
}

export function getChapterById(chapterId) {
  return chapterIndex.get(chapterId) ?? null
}

export function getAllChapters() {
  return [...chapterIndex.values()]
}

export function examMatchesFilter(exam, filter) {
  if (filter.category && exam.category !== filter.category) return false
  if (filter.subcategory != null && exam.subcategory !== filter.subcategory) return false
  return true
}

export function filterExamsByChapter(exams, chapter) {
  if (!chapter?.filters?.length) return []
  return exams.filter(e => chapter.filters.some(f => examMatchesFilter(e, f)))
}

export function getChapterSections(chapter) {
  if (!chapter?.filters?.length) return []
  const sections = []
  const seen = new Set()
  for (const f of chapter.filters) {
    if (f.subcategory != null) {
      const key = `${f.category}::${f.subcategory}`
      if (seen.has(key)) continue
      seen.add(key)
      sections.push({
        id: key,
        label: f.sectionLabel ?? f.subcategory,
        filter: f,
      })
    } else if (f.category) {
      const subs = new Set(
        chapter.filters
          .filter(x => x.category === f.category && x.subcategory != null)
          .map(x => x.subcategory)
      )
      if (subs.size === 0) {
        const key = f.category
        if (seen.has(key)) continue
        seen.add(key)
        sections.push({
          id: key,
          label: f.category,
          filter: f,
        })
      }
    }
  }
  return sections
}

export function filterExamsBySection(exams, chapter, section) {
  const base = filterExamsByChapter(exams, chapter)
  if (!section?.filter) return base
  return base.filter(e => examMatchesFilter(e, section.filter))
}

export function findChapterForExam(exam) {
  for (const chapter of chapterIndex.values()) {
    if (chapter.filters.some(f => examMatchesFilter(exam, f))) return chapter
  }
  return null
}

export function getChapterShortLabel(chapterId) {
  return getChapterById(chapterId)?.shortLabel ?? null
}

const subcategoryDisplayMap = new Map()

for (const part of curriculum.parts) {
  for (const chapter of part.chapters) {
    for (const f of chapter.filters) {
      if (f.subcategory == null) continue
      const key = `${f.category}::${f.subcategory}`
      if (subcategoryDisplayMap.has(key)) continue
      const solo =
        chapter.filters.length === 1 && chapter.filters[0].subcategory === f.subcategory
      subcategoryDisplayMap.set(key, solo ? chapter.shortLabel : f.subcategory)
    }
  }
}

/** taxonomy subcategory(예: 집합건물법) → 목차에 쓰는 표시명(예: 집합건물의 소유 및 관리에 관한 법률) */
export function getSubcategoryDisplayLabel(category, subcategory) {
  if (!subcategory) return ''
  return subcategoryDisplayMap.get(`${category}::${subcategory}`) ?? subcategory
}

export function countCurriculumChapters() {
  return chapterIndex.size
}
