/** 기출 시험 채점 기준 (40문항 × 2.5점 = 100점) */
export const PAST_EXAM_POINTS_PER_QUESTION = 2.5
export const PAST_EXAM_TOTAL_POINTS = 100
export const PAST_EXAM_PASS_SCORE = 60
export const PAST_EXAM_PASS_MIN_CORRECT = 24
export const PAST_EXAM_GWAKJAK_MIN_CORRECT = 16

export function evaluatePastExamScore(correctCount, totalQuestions = 40) {
  const score = Math.round(correctCount * PAST_EXAM_POINTS_PER_QUESTION * 10) / 10
  const hasGwakjak = correctCount < PAST_EXAM_GWAKJAK_MIN_CORRECT
  const passed = !hasGwakjak && correctCount >= PAST_EXAM_PASS_MIN_CORRECT

  let statusLabel = '불합격'
  let statusDetail = `${PAST_EXAM_PASS_SCORE}점 미만 (${PAST_EXAM_PASS_MIN_CORRECT}문항 미달)`
  if (hasGwakjak) {
    statusDetail = `과락 · ${PAST_EXAM_GWAKJAK_MIN_CORRECT}문항 미만 (현재 ${correctCount}문항)`
  } else if (passed) {
    statusLabel = '합격'
    statusDetail = `${PAST_EXAM_PASS_SCORE}점 이상 · 과락 면함`
  }

  return {
    score,
    totalQuestions,
    correctCount,
    passed,
    hasGwakjak,
    statusLabel,
    statusDetail,
  }
}

/** @param {import('./loadExam').ExamQuestion} exam */
export function itemKeyToChoiceNo(item) {  const n = parseInt(item.key, 10)
  return Number.isNaN(n) ? null : n
}

/** @param {import('./loadExam').ExamQuestion} exam */
export function gradePastExamQuestion(exam, userAnswers, finalChoice) {
  const itemResults = exam.items.map(item => {
    const pick = userAnswers[item.key] ?? null
    return {
      key: item.key,
      pick,
      correct: pick != null && pick === item.answer,
      expected: item.answer,
    }
  })
  const itemOxAnswered = itemResults.filter(r => r.pick != null).length
  const itemOxCorrect = itemResults.filter(r => r.correct).length
  const itemOxTotal = exam.items.length
  const hasFinal = Boolean(exam.correct_choice)
  const finalCorrect = hasFinal && finalChoice != null && finalChoice === exam.correct_choice
  const questionCorrect = hasFinal
    ? finalCorrect
    : itemOxAnswered > 0 && itemOxCorrect === itemOxTotal

  return {
    itemOxCorrect,
    itemOxTotal,
    itemOxAnswered,
    itemResults,
    finalChoice: finalChoice ?? null,
    finalCorrect,
    questionCorrect,
    correctChoice: exam.correct_choice ?? null,
  }
}

/** @param {import('./loadExam').ExamQuestion[]} exams */
export function summarizePastExamResults(exams, resultsById) {
  let questionCorrect = 0
  let questionGraded = 0
  let itemOxCorrect = 0
  let itemOxAnswered = 0

  for (const exam of exams) {
    const r = resultsById[exam.id]
    if (!r) continue
    questionGraded += 1
    if (r.questionCorrect) questionCorrect += 1
    itemOxCorrect += r.itemOxCorrect
    itemOxAnswered += r.itemOxAnswered
  }

  return {
    questionCorrect,
    questionGraded,
    questionTotal: exams.length,
    itemOxCorrect,
    itemOxAnswered,
    allGraded: questionGraded === exams.length && exams.length > 0,
  }
}
