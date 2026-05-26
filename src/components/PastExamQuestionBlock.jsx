import { memo } from 'react'
import AiLinkButtons from './AiLinkButtons'
import HighlightText from './HighlightText'
import { getTermMatchInfo } from '../data/glossaryIndex'
import { itemKeyToChoiceNo } from '../data/pastExamGrade'
import { makeNoteId } from '../data/studyNotes'
import { buildPastExamItemAiPrompt } from '../utils/aiLinks'
import { QuestionNumberPrefix } from './StudyModeShared'

const CHOICE_MARKERS = ['①', '②', '③', '④', '⑤']

function cleanExplanation(text) {
  if (!text) return ''
  return text
    .replace(/━+/g, '')
    .replace(/^[ \t]*[-─━=]{3,}[ \t]*$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function ItemAiButtons({ exam, item, finalChoice, revealed, questionCorrect }) {
  return (
    <AiLinkButtons
      prompt={buildPastExamItemAiPrompt({
        exam,
        item,
        finalChoice,
        revealed,
        questionCorrect,
      })}
      className="w-full items-start"
      buttonRowClassName="justify-start flex-wrap"
    />
  )
}

function ItemExplanationWithAi({
  exam,
  item,
  finalChoice,
  revealed,
  questionCorrect,
  itemExplanation,
  highlightTerm,
}) {
  return (
    <div className="space-y-1 mt-1">
      {itemExplanation ? (
        <p className="text-xs text-slate-600 leading-relaxed min-w-0">
          <HighlightText text={itemExplanation} term={highlightTerm} />
        </p>
      ) : (
        <p className="text-xs text-slate-400 italic min-w-0">해설 준비 중</p>
      )}
      <ItemAiButtons
        exam={exam}
        item={item}
        finalChoice={finalChoice}
        revealed={revealed}
        questionCorrect={questionCorrect}
      />
    </div>
  )
}

function NoteSaveCheckbox({ exam, item, savedNotes, onToggleNote }) {
  if (!onToggleNote) return null
  const noteSaved = Boolean(savedNotes?.[makeNoteId(exam.id, item.key)])
  return (
    <label
      className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 cursor-pointer select-none"
      onClick={e => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={noteSaved}
        onChange={() => onToggleNote(exam, item)}
        className="rounded border-slate-300 text-amber-600 focus:ring-amber-400 w-4 h-4"
      />
      <span className={`text-xs font-semibold ${noteSaved ? 'text-amber-700' : 'text-slate-600'}`}>
        암기노트저장
      </span>
    </label>
  )
}

function PastExamQuestionBlock({
  exam,
  finalChoice,
  revealed,
  result,
  onFinalPick,
  highlightTerm = null,
  showAnswersAlways = false,
  savedNotes = {},
  onToggleNote,
}) {
  const isComposite = exam.question_type === 'composite'
  const isPickOne = exam.question_type === 'wrong' || exam.question_type === 'correct'
  const termMatch = highlightTerm ? getTermMatchInfo(exam, highlightTerm) : null
  const showAnswer = revealed || showAnswersAlways

  return (
    <div className="space-y-4">
      <div className="flex w-full items-center gap-2 min-w-0">
        <span className="shrink-0 text-xs bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100 rounded-full px-3 py-1 font-medium">
          {exam.category}
        </span>
        {exam.subcategory && (
          <span className="shrink-0 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-full px-3 py-1">
            {highlightTerm ? (
              <HighlightText text={exam.subcategory} term={highlightTerm} />
            ) : (
              exam.subcategory
            )}
          </span>
        )}
        <span className="shrink-0 text-xs text-slate-400 ml-auto pl-1">
          {exam.year}년 제{exam.round}회
        </span>
      </div>

      {highlightTerm && termMatch && (
        <p className="text-xs text-red-600 font-medium leading-relaxed">
          {termMatch.inBody && termMatch.inSubcategory && (
            <>용어집 「{highlightTerm}」: 소분류·지문·보기 중 빨간색 표시</>
          )}
          {termMatch.inBody && !termMatch.inSubcategory && (
            <>용어집 「{highlightTerm}」 포함 부분을 빨간색으로 표시합니다</>
          )}
          {!termMatch.inBody && termMatch.inSubcategory && (
            <>
              「{highlightTerm}」은 지문·보기에는 없고, 위 <strong>소분류</strong>에 포함되어 연결된 문항입니다.
            </>
          )}
        </p>
      )}

      <div className="relative bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <p className="text-slate-800 leading-relaxed text-base font-medium whitespace-pre-wrap">
          <QuestionNumberPrefix
            questionNo={exam.question_no}
            gradeCorrect={revealed && result ? result.questionCorrect : null}
          />
          <HighlightText text={exam.stem} term={highlightTerm} />
        </p>
        {isComposite && exam.combo_choices?.length > 0 && !showAnswersAlways && (
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            기출 선택지를 고른 뒤, 맨 아래로 스크롤해 「정답 확인」을 누르세요.
          </p>
        )}
        {isPickOne && !showAnswersAlways && (
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            {exam.question_type === 'wrong' ? '틀린' : '옳은'} 보기를 고른 뒤, 맨 아래로 스크롤해 「정답 확인」을
            누르세요.
          </p>
        )}
        {showAnswersAlways && exam.correct_choice != null && (
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            기출 정답 {CHOICE_MARKERS[exam.correct_choice - 1]}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {exam.items.map(item => {
          const itemExplanation = cleanExplanation(item.explanation)

          if (isPickOne) {
            const choiceNo = itemKeyToChoiceNo(item)
            if (choiceNo == null) return null
            const isSelected = finalChoice === choiceNo
            const isExamAnswer = showAnswer && choiceNo === exam.correct_choice
            const pickRight = revealed && isSelected && result?.finalCorrect
            const pickWrong = revealed && isSelected && !result?.finalCorrect

            return (
              <div
                key={item.key}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                  pickRight
                    ? 'border-green-400 bg-green-50'
                    : pickWrong
                      ? 'border-red-400 bg-red-50'
                      : isExamAnswer
                        ? 'border-slate-800 bg-slate-50'
                        : isSelected
                          ? 'border-2 border-indigo-500 bg-indigo-100 shadow-md ring-2 ring-indigo-200/80'
                          : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  disabled={revealed && !showAnswersAlways}
                  onClick={() => onFinalPick?.(choiceNo)}
                  className="w-full text-left disabled:cursor-default"
                >
                  <div className="flex gap-2 min-w-0">
                    <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">{item.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm leading-relaxed">
                        <HighlightText text={item.text} term={highlightTerm} />
                      </p>
                      {!revealed && isSelected && (
                        <p className="text-xs font-bold text-indigo-700 mt-2">✓ 내가 고른 답</p>
                      )}
                    </div>
                  </div>
                </button>
                {showAnswer && (
                  <div className="mt-2 pl-8 sm:pl-0 sm:ml-9 border-t border-slate-200/80 pt-2 space-y-1">
                    {isExamAnswer && <p className="text-xs font-semibold text-slate-800">기출 정답</p>}
                    {revealed && isSelected && (
                      <p className={`text-xs font-semibold ${pickRight ? 'text-green-600' : 'text-red-600'}`}>
                        {pickRight ? '✓ 맞았습니다' : '✗ 틀렸습니다'}
                      </p>
                    )}
                    <ItemExplanationWithAi
                      exam={exam}
                      item={item}
                      finalChoice={finalChoice}
                      revealed={revealed}
                      questionCorrect={result?.questionCorrect}
                      itemExplanation={itemExplanation}
                      highlightTerm={highlightTerm}
                    />
                  </div>
                )}
                <NoteSaveCheckbox
                  exam={exam}
                  item={item}
                  savedNotes={savedNotes}
                  onToggleNote={onToggleNote}
                />
              </div>
            )
          }

          if (isComposite) {
            return (
              <div
                key={item.key}
                className={`rounded-2xl border-2 p-4 transition-colors ${
                  revealed ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex gap-2 min-w-0">
                  <span className="flex-none text-sm font-bold text-slate-500 w-6 pt-0.5">{item.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm leading-relaxed">
                      <HighlightText text={item.text} term={highlightTerm} />
                    </p>
                    {showAnswer && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1">
                        <p className="text-xs font-semibold">
                          <span className={item.answer === 'O' ? 'text-blue-600' : 'text-red-600'}>
                            정답 {item.answer}
                          </span>
                        </p>
                        <ItemExplanationWithAi
                          exam={exam}
                          item={item}
                          finalChoice={finalChoice}
                          revealed={revealed}
                          questionCorrect={result?.questionCorrect}
                          itemExplanation={itemExplanation}
                          highlightTerm={highlightTerm}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <NoteSaveCheckbox
                  exam={exam}
                  item={item}
                  savedNotes={savedNotes}
                  onToggleNote={onToggleNote}
                />
              </div>
            )
          }

          return null
        })}
      </div>

      {exam.combo_choices?.length > 0 && (
        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">기출 선택지 (내 답 고르기)</p>
          <div className="flex flex-wrap gap-2">
            {exam.combo_choices.map(c => {
              const isSelected = finalChoice === c.no
              const showComboFeedback = revealed || showAnswersAlways
              const comboRight = showComboFeedback && isSelected && c.is_correct
              const comboWrong = showComboFeedback && isSelected && !c.is_correct
              const comboClass = showComboFeedback
                ? c.is_correct
                  ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                  : comboWrong
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-slate-600 border-slate-200'
                : isSelected
                  ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-500 font-bold shadow-md ring-2 ring-indigo-200/80 scale-[1.02]'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'

              return (
                <button
                  key={c.no}
                  type="button"
                  disabled={revealed && !showAnswersAlways}
                  onClick={() => onFinalPick?.(c.no)}
                  aria-pressed={isSelected}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ${comboClass} ${
                    comboRight ? 'ring-2 ring-green-400' : ''
                  }`}
                >
                  {c.label} {c.text}
                  {comboRight && <span className="ml-1 text-green-200">✓</span>}
                  {comboWrong && <span className="ml-1">✗</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {revealed && result && (
        <p
          className={`text-center text-sm font-semibold rounded-xl py-2 ${
            result.questionCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {result.questionCorrect ? '이 문항 정답' : '이 문항 오답'}
          {exam.correct_choice != null && (
            <span className="text-slate-600 font-normal ml-1">
              · 기출 정답 {CHOICE_MARKERS[exam.correct_choice - 1]}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

export default memo(PastExamQuestionBlock)
