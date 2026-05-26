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
