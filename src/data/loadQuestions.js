import index from './questions/index.json'
import y2016 from './questions/2016.json'
import y2017 from './questions/2017.json'
import y2018 from './questions/2018.json'
import y2019 from './questions/2019.json'
import y2020 from './questions/2020.json'
import y2021 from './questions/2021.json'
import y2022 from './questions/2022.json'
import y2023 from './questions/2023.json'
import y2024 from './questions/2024.json'
import y2025 from './questions/2025.json'

const byYear = {
  2016: y2016,
  2017: y2017,
  2018: y2018,
  2019: y2019,
  2020: y2020,
  2021: y2021,
  2022: y2022,
  2023: y2023,
  2024: y2024,
  2025: y2025,
}

/** @type {import('./questions/2022.json')[number][]} */
export const allQuestions = Object.values(byYear)
  .flat()
  .sort((a, b) => {
    const orderA = a.textbook_order ?? 999
    const orderB = b.textbook_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    if (a.year !== b.year) return a.year - b.year
    if (a.question_no !== b.question_no) return a.question_no - b.question_no
    return (a.choice_no ?? 0) - (b.choice_no ?? 0)
  })

export const questionIndex = index

export const sortModes = {
  textbook: (a, b) => {
    const o = (a.textbook_order ?? 999) - (b.textbook_order ?? 999)
    if (o !== 0) return o
    if (a.year !== b.year) return a.year - b.year
    if (a.question_no !== b.question_no) return a.question_no - b.question_no
    return (a.choice_no ?? 0) - (b.choice_no ?? 0)
  },
  year: (a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if (a.question_no !== b.question_no) return a.question_no - b.question_no
    return (a.choice_no ?? 0) - (b.choice_no ?? 0)
  },
}

export function sortQuestions(list, mode = 'textbook') {
  const cmp = sortModes[mode] ?? sortModes.textbook
  return [...list].sort(cmp)
}
