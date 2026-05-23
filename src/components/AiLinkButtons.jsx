import { useState } from 'react'
import { AI_SERVICES, buildItemAiPrompt, openAiService } from '../utils/aiLinks'

export default function AiLinkButtons({ exam, item, userAnswer }) {
  const [toast, setToast] = useState(null)
  const prompt = buildItemAiPrompt({ exam, item, userAnswer })

  const handleClick = async (serviceId) => {
    const { copied } = await openAiService(serviceId, prompt)
    const label = AI_SERVICES.find(s => s.id === serviceId)?.label ?? ''
    if (copied) {
      setToast(`${label}: 질문 복사됨 · 새 창에서 Ctrl+V`)
      window.setTimeout(() => setToast(null), 3200)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-1" role="group" aria-label="AI에서 자세히 보기">
        {AI_SERVICES.map(service => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleClick(service.id)}
            className={`ai-link-btn ai-link-btn-${service.id}`}
            title={
              service.mode === 'clipboard'
                ? `${service.label} 열기 + 질문 복사 (붙여넣기)`
                : `${service.label}에서 보기·해설 질문하기`
            }
          >
            {service.label}
            {service.mode === 'clipboard' && (
              <span className="ai-link-btn-copy" aria-hidden>
                ⧉
              </span>
            )}
          </button>
        ))}
      </div>
      {toast && (
        <p className="ai-link-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}
