import { useState } from 'react'
import {
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

export default function SettingsSheet({ settings, onChange, onClose }) {
  const [local, setLocal] = useState(settings)

  const handleApply = () => {
    onChange(local)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
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
