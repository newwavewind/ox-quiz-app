import { useState } from 'react'
import AiServiceIcon from './AiServiceIcon'
import { AI_SERVICES, buildItemAiPrompt, openAiService } from '../utils/aiLinks'

const PROMINENT_ICON_COLOR = {
  chatgpt: 'text-[#10a37f]',
  gemini: '',
  claude: 'text-[#c96442]',
}

export default function AiLinkButtons({
  exam,
  item,
  userAnswer,
  prompt: promptOverride,
  size = 'compact',
  className = '',
  buttonRowClassName = '',
}) {
  const prominent = size === 'prominent'
  const [toast, setToast] = useState(null)
  const prompt =
    promptOverride ?? (exam && item ? buildItemAiPrompt({ exam, item, userAnswer }) : '')

  const handleClick = async (serviceId) => {
    if (!prompt) return
    const { copied } = await openAiService(serviceId, prompt)
    const label = AI_SERVICES.find(s => s.id === serviceId)?.label ?? ''
    if (copied) {
      setToast(`${label}: 질문 복사됨 · 새 창에서 Ctrl+V`)
      window.setTimeout(() => setToast(null), 3200)
    }
  }

  return (
    <div className={`flex flex-col items-end gap-0.5 shrink-0 ${prominent ? 'min-w-0' : ''} ${className}`}>
      {prominent && (
        <span className="text-[9px] text-slate-400 font-medium">AI 용어 설명</span>
      )}
      <div
        className={`flex items-center flex-wrap ${prominent ? 'gap-1 justify-end' : 'gap-1'} ${buttonRowClassName}`}
        role="group"
        aria-label="AI에서 자세히 보기"
      >
        {AI_SERVICES.map(service => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleClick(service.id)}
            className={`ai-link-btn ai-link-btn-${service.id} ${prominent ? 'ai-link-btn-prominent' : ''}`}
            title={
              service.mode === 'clipboard'
                ? `${service.label} 열기 + 질문 복사 (붙여넣기)`
                : `${service.label}에서 보기·해설 질문하기`
            }
          >
            <span className={service.id === 'claude' ? '' : PROMINENT_ICON_COLOR[service.id]}>
              <AiServiceIcon id={service.id} className="w-3 h-3" />
            </span>
            <span>{service.label}</span>
            {service.mode === 'clipboard' && (
              <span className="ai-link-btn-copy" aria-hidden>
                ⧉
              </span>
            )}
          </button>
        ))}
      </div>
      {toast && (
        <p className={`ai-link-toast ${prominent ? 'text-[10px] max-w-[11rem]' : ''}`} role="status">
          {toast}
        </p>
      )}
    </div>
  )
}
