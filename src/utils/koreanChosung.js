/** 한글 초성 (유니코드 조합형) */
const CHOSUNG_RAW = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

/** 목차·점프용 (쌍자음 → 단일 초성) */
export const CHOSUNG_NAV = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const COLLAPSE = {
  ㄲ: 'ㄱ',
  ㄸ: 'ㄷ',
  ㅃ: 'ㅂ',
  ㅆ: 'ㅅ',
  ㅉ: 'ㅈ',
}

export function getChosungFromChar(char) {
  if (!char) return null
  const code = char.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const idx = Math.floor((code - 0xac00) / 588)
    return CHOSUNG_RAW[idx] ?? null
  }
  return null
}

/** 용어 첫 글자의 초성 그룹 (ㄱ~ㅎ, 없으면 null) */
export function getTermChosungKey(term) {
  const first = (term || '').trim()[0]
  if (!first) return null
  const raw = getChosungFromChar(first)
  if (!raw) return null
  return COLLAPSE[raw] || raw
}
