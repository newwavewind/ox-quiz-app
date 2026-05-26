const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'DEL',
  'S',
  'STRIKE',
  'SPAN',
  'BR',
  'P',
  'DIV',
  'IMG',
])
const GUIDE_IMG_PREFIX = '/guide/'
const ALLOWED_STYLES = new Set([
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'background-color',
])

export const FONT_OPTIONS = [
  { id: 'default', label: '기본', value: 'inherit' },
  { id: 'sans', label: '고딕', value: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" },
  { id: 'serif', label: '명조', value: "Georgia, 'Nanum Myeongjo', serif" },
  { id: 'mono', label: '고정폭', value: 'ui-monospace, monospace' },
]

export const SIZE_OPTIONS = [
  { id: '12', label: '12', value: '12px' },
  { id: '14', label: '14', value: '14px' },
  { id: '16', label: '16', value: '16px' },
  { id: '18', label: '18', value: '18px' },
  { id: '20', label: '20', value: '20px' },
  { id: '24', label: '24', value: '24px' },
]

const COLOR_PRESETS = [
  '#0f172a',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
]

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function filterStyle(styleAttr) {
  if (!styleAttr) return ''
  const parts = styleAttr
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
  const kept = []
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim().toLowerCase()
    const val = part.slice(idx + 1).trim()
    if (!ALLOWED_STYLES.has(key)) continue
    if (/^(javascript|expression|url\s*\()/i.test(val)) continue
    kept.push(`${key}:${val}`)
  }
  return kept.length ? kept.join(';') : ''
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const tag = node.tagName
  if (!ALLOWED_TAGS.has(tag)) {
    return [...node.childNodes].map(sanitizeNode).join('')
  }

  if (tag === 'BR') return '<br>'

  if (tag === 'IMG') {
    const src = (node.getAttribute('src') || '').trim()
    if (!src.startsWith(GUIDE_IMG_PREFIX) || /[\s"<>]/.test(src)) return ''
    const alt = escapeHtml(node.getAttribute('alt') || '')
    const loading = node.getAttribute('loading') === 'lazy' ? ' loading="lazy"' : ''
    return `<img src="${src.replace(/"/g, '')}" alt="${alt}"${loading}>`
  }

  const style = tag === 'SPAN' ? filterStyle(node.getAttribute('style')) : ''
  const styleAttr = style ? ` style="${style.replace(/"/g, '')}"` : ''
  const inner = [...node.childNodes].map(sanitizeNode).join('')
  return `<${tag.toLowerCase()}${styleAttr}>${inner}</${tag.toLowerCase()}>`
}

/** 게시글 본문 HTML 허용 태그만 남김 */
export function sanitizePostHtml(raw) {
  if (!raw) return ''
  if (!/[<>]/.test(raw)) return escapeHtml(raw).replace(/\n/g, '<br>')

  const doc = new DOMParser().parseFromString(raw, 'text/html')
  return [...doc.body.childNodes].map(sanitizeNode).join('') || escapeHtml(raw)
}

export function hasRichHtml(raw) {
  return /<[a-z][\s\S]*>/i.test(raw || '')
}

/** contentEditable 선택 영역에 스타일 span 적용 */
export function applyEditorSpanStyle(editor, cssText) {
  if (!editor || !cssText) return false
  const sel = window.getSelection()
  if (!sel?.rangeCount) return false
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return false
  if (range.collapsed) return false

  const span = document.createElement('span')
  span.style.cssText = cssText
  try {
    range.surroundContents(span)
  } catch {
    const fragment = range.extractContents()
    span.appendChild(fragment)
    range.insertNode(span)
  }
  range.setStartAfter(span)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  return true
}

export function execEditorCommand(editor, command, value = null) {
  if (!editor) return false
  editor.focus()
  document.execCommand('styleWithCSS', false, true)
  return document.execCommand(command, false, value ?? undefined)
}

const FONT_EXEC = {
  sans: 'Malgun Gothic',
  serif: 'Georgia',
  mono: 'monospace',
}

export function applyEditorFont(editor, fontId) {
  const name = FONT_EXEC[fontId]
  if (!name) return false
  return execEditorCommand(editor, 'fontName', name)
}

export function applyEditorFontSize(editor, sizePx) {
  return applyEditorSpanStyle(editor, `font-size:${sizePx}`)
}

export function applyEditorColor(editor, color) {
  return execEditorCommand(editor, 'foreColor', color)
}

export { COLOR_PRESETS }
