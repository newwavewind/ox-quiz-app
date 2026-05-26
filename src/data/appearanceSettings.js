const STORAGE_KEY = 'ox_quiz_appearance_v1'

export const THEME_OPTIONS = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

export const DESIGN_THEME_OPTIONS = [
  { value: 'theme1', label: '테마1', description: '기본 (슬레이트)' },
  { value: 'theme2', label: '테마2', description: 'Steep · 웜 캔버스' },
  { value: 'theme3', label: '테마3', description: 'GIC · 나이트 스카이' },
  { value: 'theme4', label: '테마4', description: 'Mintlify · 세이지' },
]

const CUSTOM_DESIGN_THEMES = new Set(['theme2', 'theme3', 'theme4'])

export const FONT_OPTIONS = [
  { value: 'system', label: '시스템 기본' },
  { value: 'sans', label: '고딕 (Noto Sans)' },
  { value: 'serif', label: '명조 (Noto Serif)' },
]

export const FONT_SIZE_OPTIONS = [
  { value: 'sm', label: '작게' },
  { value: 'md', label: '보통' },
  { value: 'lg', label: '크게' },
  { value: 'xl', label: '아주 크게' },
]

export const DEFAULT_APPEARANCE = {
  designTheme: 'theme1',
  theme: 'light',
  font: 'system',
  fontSize: 'md',
}

function normalizeDesignTheme(value) {
  return CUSTOM_DESIGN_THEMES.has(value) ? value : 'theme1'
}

export function isCustomDesignTheme(designTheme) {
  return CUSTOM_DESIGN_THEMES.has(designTheme)
}

function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

function normalizeFont(value) {
  return FONT_OPTIONS.some(o => o.value === value) ? value : DEFAULT_APPEARANCE.font
}

function normalizeFontSize(value) {
  return FONT_SIZE_OPTIONS.some(o => o.value === value) ? value : DEFAULT_APPEARANCE.fontSize
}

export function loadAppearanceSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }
    const parsed = JSON.parse(raw)
    return {
      designTheme: normalizeDesignTheme(parsed.designTheme),
      theme: normalizeTheme(parsed.theme),
      font: normalizeFont(parsed.font),
      fontSize: normalizeFontSize(parsed.fontSize),
    }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function saveAppearanceSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* ignore quota */
  }
}

export function applyAppearanceSettings(settings) {
  const root = document.documentElement
  const designTheme = normalizeDesignTheme(settings.designTheme)
  const theme = normalizeTheme(settings.theme)
  const font = normalizeFont(settings.font)
  const fontSize = normalizeFontSize(settings.fontSize)

  root.dataset.designTheme = designTheme
  root.dataset.font = font
  root.dataset.fontSize = fontSize

  root.classList.toggle('dark', theme === 'dark')
}
