import { useEffect, useRef, useState } from 'react'
import { DESIGN_THEME_OPTIONS } from '../data/appearanceSettings'

export default function ThemePickerMenu({ designTheme, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = value => {
    onChange(value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          open
            ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        테마
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="디자인 테마"
          className="absolute right-0 top-full mt-1 z-50 min-w-[12.5rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1 overflow-hidden"
        >
          {DESIGN_THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={designTheme === opt.value}
              onClick={() => pick(opt.value)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                designTheme === opt.value
                  ? 'bg-slate-100 dark:bg-slate-700 font-semibold text-slate-900 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
              }`}
            >
              <span className="block">{opt.label}</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
