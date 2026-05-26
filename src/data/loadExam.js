import { categorySortIndex } from './categoryStyles'
import y2016 from './exam/2016.json'
import y2017 from './exam/2017.json'
import y2018 from './exam/2018.json'
import y2019 from './exam/2019.json'
import y2020 from './exam/2020.json'
import y2021 from './exam/2021.json'
import y2022 from './exam/2022.json'
import y2023 from './exam/2023.json'
import y2024 from './exam/2024.json'
import y2025 from './exam/2025.json'

/** @typedef {typeof y2016[number]} ExamQuestion */

/** @type {ExamQuestion[]} */
export const allExams = [...y2016, ...y2017, ...y2018, ...y2019, ...y2020, ...y2021, ...y2022, ...y2023, ...y2024, ...y2025].sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year
  return a.question_no - b.question_no
})

export const sortModes = {
  number: (a, b) => a.question_no - b.question_no,
  category: (a, b) => {
    const ca = categorySortIndex(a.category)
    const cb = categorySortIndex(b.category)
    if (ca !== cb) return ca - cb
    if (a.category !== b.category) return a.category.localeCompare(b.category, 'ko')
    return a.question_no - b.question_no
  },
}

export function sortExams(list, mode = 'number') {
  const cmp = sortModes[mode] ?? sortModes.number
  return [...list].sort(cmp)
}

export function isExamComplete(progress, examId) {
  const p = progress[examId]
  return Boolean(p?.answered)
}

export function isExamCorrect(progress, examId) {
  const p = progress[examId]
  return Boolean(p?.answered && p?.correct)
}

export function isWrongNoteExam(progress, examId) {
  return isExamComplete(progress, examId)
    && !isExamCorrect(progress, examId)
    && !progress[examId]?.wrongNoteDismissed
}

/** @param {'year' | 'category'} kind */
export function isWrongNoteExamForKind(progress, examId, kind) {
  if (!isWrongNoteExam(progress, examId)) return false
  const stored = progress[examId]?.wrongNoteKind
  if (!stored) return kind === 'year'
  return stored === kind
}

export function filterWrongExamsByKind(exams, progress, kind) {
  return exams.filter(q => isWrongNoteExamForKind(progress, q.id, kind))
}

export function sortWrongExams(exams, progress, order = 'recent') {
  return [...exams].sort((a, b) => {
    const ta = progress[a.id]?.lastAnswered ?? 0
    const tb = progress[b.id]?.lastAnswered ?? 0
    return order === 'oldest' ? ta - tb : tb - ta
  })
}

/** @deprecated use sortWrongExams */
export function sortWrongExamsByRecent(exams, progress) {
  return sortWrongExams(exams, progress, 'recent')
}

/** @param {ExamQuestion} exam */
export function gradeOxStudyQuestion(exam, userAnswers) {
  if (!exam?.items?.length) return { answered: true, correct: false }
  let allPicked = true
  let allCorrect = true
  for (const item of exam.items) {
    const pick = userAnswers[item.key]
    if (pick == null) {
      allPicked = false
      allCorrect = false
    } else if (pick !== item.answer) {
      allCorrect = false
    }
  }
  return { answered: true, correct: allPicked && allCorrect }
}

/** @param {ExamQuestion[]} exams */
export function findProgressAwareStudyExamId(exams, progress, sort = 'number') {
  const sorted = sortExams(exams, sort)
  if (sorted.length === 0) return null
  const unanswered = sorted.find(q => !isExamComplete(progress, q.id))
  if (unanswered) return unanswered.id
  const wrong = sorted.find(q => isExamComplete(progress, q.id) && !isExamCorrect(progress, q.id))
  if (wrong) return wrong.id
  return sorted[0].id
}
