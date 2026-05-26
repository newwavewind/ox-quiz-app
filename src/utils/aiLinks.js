/** 보기·해설을 묶어 외부 AI 채팅으로 보낼 프롬프트·URL */

/** URL에 넣으면 ChatGPT 등도 불안정해질 수 있는 길이 */
const MAX_URL_PROMPT_LEN = 1800

const CHOICE_MARKERS = ['①', '②', '③', '④', '⑤']

export const AI_SERVICES = [
  {
    id: 'chatgpt',
    label: 'GPT',
    /** chatgpt.com/?q= 프리필 (짧은 프롬프트만) */
    mode: 'url',
    baseUrl: 'https://chatgpt.com/',
    buildUrl: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    /** gemini.google.com 은 URL 프리필 미지원 → 열기 + 복사 */
    mode: 'clipboard',
    baseUrl: 'https://gemini.google.com/app',
  },
  {
    id: 'claude',
    label: 'Claude',
    /** 긴 ?q= URL 시 페이지 로딩 실패 → 열기 + 복사 */
    mode: 'clipboard',
    baseUrl: 'https://claude.ai/new',
  },
]

export function buildGlossaryTermAiPrompt({ term, category, section }) {
  const unit = [category, section].filter(Boolean).join(' · ')
  const lines = [
    `공인중개사 민법 시험 범위의 용어로 「${term}」을(를) 설명해 주세요.`,
    '',
    '정의, 관련 민법 조문, 기출에서 자주 헷갈리는 점, 비슷한 용어와의 차이를 알려 주세요.',
    unit ? `【관련 단원】 ${unit}` : '',
  ].filter(Boolean)
  return lines.join('\n\n').slice(0, 6000)
}

export function buildItemAiPrompt({ exam, item, userAnswer }) {
  const meta = [
    exam.year && `${exam.year}년`,
    exam.round && `제${exam.round}회`,
    exam.question_no && `${exam.question_no}번`,
    exam.category,
    item.label,
  ]
    .filter(Boolean)
    .join(' · ')

  const lines = [
    '[공인중개사 기출 OX] 아래 내용을 바탕으로 관련 조문·판례·헷갈리는 포인트를 자세히 설명해 주세요.',
    '',
    meta ? `【출처】 ${meta}` : '',
    exam.stem ? `【지문】\n${exam.stem}` : '',
    item.text ? `【보기 ${item.label}】\n${item.text}` : '',
    userAnswer ? `【내가 고른 답】 ${userAnswer} (정답 ${item.answer})` : '',
    item.explanation ? `【해설】\n${item.explanation}` : '',
  ].filter(Boolean)

  return lines.join('\n\n').slice(0, 6000)
}

export function buildPastExamItemAiPrompt({
  exam,
  item,
  finalChoice = null,
  revealed = false,
  questionCorrect = null,
}) {
  const choiceNo = parseInt(item.key, 10)
  const meta = [
    exam.year && `${exam.year}년`,
    exam.round && `제${exam.round}회`,
    exam.question_no && `${exam.question_no}번`,
    exam.category,
    item.label,
  ]
    .filter(Boolean)
    .join(' · ')

  const lines = [
    '[공인중개사 기출] 아래 내용을 바탕으로 관련 조문·판례·헷갈리는 포인트를 자세히 설명해 주세요.',
    '',
    meta ? `【출처】 ${meta}` : '',
    exam.stem ? `【지문】\n${exam.stem}` : '',
    item.text ? `【보기 ${item.label}】\n${item.text}` : '',
  ]

  if (exam.correct_choice != null) {
    lines.push(`【기출 정답】 ${CHOICE_MARKERS[exam.correct_choice - 1]}`)
  }
  if (finalChoice != null) {
    let pickLine = `【내가 고른 답】 ${CHOICE_MARKERS[finalChoice - 1]}`
    if (revealed && questionCorrect != null) {
      pickLine += questionCorrect ? ' (문항 정답)' : ' (문항 오답)'
    }
    lines.push(pickLine)
  }
  if (exam.combo_choices?.length && finalChoice != null) {
    const combo = exam.combo_choices.find(c => c.no === finalChoice)
    if (combo) {
      lines.push(`【내가 고른 기출 선택지】 ${combo.label} ${combo.text}`)
    }
  }
  if (!Number.isNaN(choiceNo) && finalChoice === choiceNo) {
    lines.push('【참고】 위 「내가 고른 답」이 이 보기입니다.')
  } else if (!Number.isNaN(choiceNo) && exam.correct_choice === choiceNo) {
    lines.push('【참고】 이 보기가 기출 정답입니다.')
  }
  if (item.answer) {
    lines.push(`【이 보기 O/X】 ${item.answer}`)
  }
  if (item.explanation) {
    lines.push(`【해설】\n${item.explanation}`)
  }

  return lines.filter(Boolean).join('\n\n').slice(0, 6000)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

/**
 * @returns {{ copied: boolean, serviceId: string }}
 */
export async function openAiService(serviceId, prompt) {
  const service = AI_SERVICES.find(s => s.id === serviceId)
  if (!service) return { copied: false, serviceId }

  const useUrl =
    service.mode === 'url' &&
    service.buildUrl &&
    prompt.length <= MAX_URL_PROMPT_LEN &&
    service.buildUrl(prompt).length <= 8000

  let copied = false

  if (!useUrl) {
    copied = await copyText(prompt)
    window.open(service.baseUrl, '_blank', 'noopener,noreferrer')
  } else {
    window.open(service.buildUrl(prompt), '_blank', 'noopener,noreferrer')
  }

  return { copied, serviceId }
}
