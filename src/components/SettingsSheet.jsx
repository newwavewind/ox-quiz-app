import { useState } from 'react'
import {
  DESIGN_THEME_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
} from '../data/appearanceSettings'

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsSheet({
  settings,
  onChange,
  onClose,
  userId = '',
  onUserIdChange,
  canEditUserId = false,
}) {
  const [local, setLocal] = useState(settings)
  const [localUserId, setLocalUserId] = useState(userId)
  const [userIdError, setUserIdError] = useState('')

  const handleApply = () => {
    if (canEditUserId) {
      const trimmed = localUserId.trim()
      if (!trimmed) {
        setUserIdError('아이디를 입력하세요.')
        return
      }
      if (trimmed.length < 2) {
        setUserIdError('아이디는 2자 이상이어야 합니다.')
        return
      }
      onUserIdChange?.(trimmed)
    }
    onChange(local)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            설정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {canEditUserId && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              아이디
            </p>
            <input
              type="text"
              value={localUserId}
              onChange={e => {
                setLocalUserId(e.target.value)
                setUserIdError('')
              }}
              maxLength={20}
              placeholder="커뮤니티·표시용 아이디"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">상단 표시·커뮤니티 글쓰기에 사용됩니다.</p>
            {userIdError && <p className="text-xs text-red-600 mt-1">{userIdError}</p>}
          </div>
        )}

        <OptionGroup
          label="디자인 테마"
          options={DESIGN_THEME_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={local.designTheme || 'theme1'}
          onChange={designTheme => setLocal(s => ({ ...s, designTheme }))}
        />

        <OptionGroup
          label="화면 모드"
          options={THEME_OPTIONS}
          value={local.theme}
          onChange={theme => setLocal(s => ({ ...s, theme }))}
        />
        <OptionGroup
          label="글꼴"
          options={FONT_OPTIONS}
          value={local.font}
          onChange={font => setLocal(s => ({ ...s, font }))}
        />
        <OptionGroup
          label="글자 크기"
          options={FONT_SIZE_OPTIONS}
          value={local.fontSize}
          onChange={fontSize => setLocal(s => ({ ...s, fontSize }))}
        />

        <button
          type="button"
          onClick={handleApply}
          className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl py-4 font-bold"
        >
          적용하기
        </button>
      </div>
    </div>
  )
}
