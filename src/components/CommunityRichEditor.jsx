import { useEffect, useRef } from 'react'
import { hasRichHtml } from '../utils/communityRichText'

function valueToEditorHtml(value) {
  if (!value) return ''
  if (hasRichHtml(value)) return value
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

export function getContentPlainText(raw) {
  if (!raw) return ''
  if (!hasRichHtml(raw)) return raw.trim()
  const div = document.createElement('div')
  div.innerHTML = raw
  // textContent는 <div>/<br> 줄바꿈을 무시함 → innerText 사용
  return (div.innerText || div.textContent || '').trim()
}

export function getContentTextLength(raw) {
  return getContentPlainText(raw).length
}

/** @param {{ value: string, onChange: (html: string) => void, editorRef?: import('react').MutableRefObject<HTMLElement|null>, maxLength?: number, placeholder?: string, className?: string }} props */
export default function CommunityRichEditor({
  value,
  onChange,
  editorRef,
  maxLength = 8000,
  placeholder = '내용을 입력하세요...',
  className = '',
}) {
  const localRef = useRef(null)
  const lastValidRef = useRef('')

  const attachRef = node => {
    localRef.current = node
    if (editorRef) editorRef.current = node
  }

  useEffect(() => {
    const el = localRef.current
    if (!el) return
    const html = valueToEditorHtml(value)
    if (el.innerHTML !== html) {
      el.innerHTML = html
      lastValidRef.current = html
    }
  }, [value])

  const syncFromEditor = () => {
    const el = localRef.current
    if (!el) return
    const html = el.innerHTML
    const len = (el.textContent || '').length
    if (len > maxLength) {
      el.innerHTML = lastValidRef.current
      return
    }
    lastValidRef.current = html
    onChange(html === '<br>' ? '' : html)
  }

  const handlePaste = e => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    syncFromEditor()
  }

  return (
    <div
      ref={attachRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      onInput={syncFromEditor}
      onBlur={syncFromEditor}
      onPaste={handlePaste}
      className={`community-rich-editor w-full px-4 py-3 text-sm text-slate-800 leading-relaxed min-h-[220px] focus:outline-none border-t border-slate-100 ${className}`}
    />
  )
}

