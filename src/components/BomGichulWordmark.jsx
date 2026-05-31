import { APP_NAME } from '../data/brand'

/**
 * 탭 헤더용 2색 워드마크 — 봄(핑크) + 기출(그린) + · {suffix}(검정)
 * @param {{ suffix?: string, className?: string, showIcon?: boolean }} props
 */
export default function BomGichulWordmark({ suffix = '학습', className = '', showIcon = false }) {
  const label = suffix ? `${APP_NAME} · ${suffix}` : APP_NAME

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {showIcon && (
        <img
          src="/pwa-192x192.png"
          alt=""
          width={36}
          height={36}
          className="shrink-0 w-9 h-9 rounded-xl shadow-sm"
          aria-hidden
        />
      )}
      <h1
        className="bom-gichul-wordmark text-2xl truncate leading-tight"
        aria-label={label}
      >
        <span className="bom-gichul-wordmark__spring">봄</span>
        <span className="bom-gichul-wordmark__gichul">기출</span>
        {suffix ? <span className="bom-gichul-wordmark__suffix"> · {suffix}</span> : null}
      </h1>
    </div>
  )
}
