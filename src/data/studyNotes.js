import { formatStudyTime } from './studyHistory'

function cleanExplanation(text) {
  if (!text) return ''
  return text
    .replace(/━+/g, '')
    .replace(/^[ \t]*[-─━=]{3,}[ \t]*$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function makeNoteId(examId, itemKey) {
  return `${examId}::${itemKey}`
}

/**
 * @param {import('./loadExam').allExams[number]} exam
 * @param {import('./loadExam').allExams[number]['items'][number]} item
 */
export function buildStudyNote(exam, item) {
  return {
    id: makeNoteId(exam.id, item.key),
    examId: exam.id,
    itemKey: item.key,
    year: exam.year,
    round: exam.round,
    questionNo: exam.question_no,
    category: exam.category,
    subcategory: exam.subcategory ?? null,
    stem: exam.stem,
    itemLabel: item.label,
    itemText: item.text,
    answer: item.answer,
    explanation: cleanExplanation(item.explanation ?? ''),
    important: false,
    savedAt: Date.now(),
  }
}

export function formatExamRef(note) {
  return `제${note.round}회 · ${note.questionNo}번`
}

/** @returns {{ exam: object, item: object }} AiLinkButtons용 */
export function noteToAiContext(note) {
  return {
    exam: {
      year: note.year,
      round: note.round,
      question_no: note.questionNo,
      category: note.category,
      stem: note.stem,
    },
    item: {
      label: note.itemLabel,
      text: note.itemText,
      answer: note.answer,
      explanation: note.explanation,
    },
  }
}

export { formatStudyTime }

export function listNotes(notesMap, { importantOnly = false } = {}) {
  let list = Object.values(notesMap)
  if (importantOnly) list = list.filter(n => n.important)
  return list.sort((a, b) => b.savedAt - a.savedAt)
}

export function countImportantNotes(notesMap) {
  return Object.values(notesMap).filter(n => n.important).length
}
