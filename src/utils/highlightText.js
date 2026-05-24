/** 검색·하이라이트용 (띄어쓰기 무시) */
export function normalizeForMatch(text) {
  return (text || '').replace(/\s+/g, '')
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 용어 글자 사이 공백 허용 (예: 복 대리) */
export function buildTermPattern(term) {
  const chars = normalizeForMatch(term).split('').filter(Boolean)
  if (chars.length === 0) return null
  return chars.map(c => escapeRegex(c)).join('\\s*')
}

/**
 * @param {string} text
 * @param {string} term
 * @returns {{ text: string, highlight: boolean }[]}
 */
export function splitByTermHighlight(text, term) {
  if (!text || !term?.trim()) return [{ text, highlight: false }]
  const pattern = buildTermPattern(term)
  if (!pattern) return [{ text, highlight: false }]

  const re = new RegExp(pattern, 'gi')
  const parts = []
  let lastIndex = 0
  let match = re.exec(text)
  while (match) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), highlight: false })
    }
    parts.push({ text: match[0], highlight: true })
    lastIndex = match.index + match[0].length
    match = re.exec(text)
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false })
  }
  return parts.length > 0 ? parts : [{ text, highlight: false }]
}
