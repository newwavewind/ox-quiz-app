import { APP_NAME } from '../data/brand'

/**
 * 홈 헤더용 2색 워드마크 — 아이콘 타이포(봄=핑크, 기출=그린)와 동일
 */
export default function BomGichulWordmark({ className = '', showIcon = false }) {
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
        aria-label={APP_NAME}
      >
        <span className="bom-gichul-wordmark__spring">봄</span>
        <span className="bom-gichul-wordmark__gichul">기출</span>
      </h1>
    </div>
  )
}
