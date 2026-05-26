/** 홈 화면 카테고리 순서·스타일 (민법 편·장 순, taxonomy.json과 이름 일치) */
export const CATEGORY_ORDER = [
  '법률행위',
  '대리',
  '물권총칙',
  '물권변동',
  '점유·시효',
  '물권적청구권',
  '소유권',
  '용익물권',
  '유치권',
  '저당권',
  '계약총론',
  '매매',
  '교환',
  '임대차',
  '민사특별법',
]

const STYLES = {
  법률행위: { color: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '⚖️' },
  대리: { color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '🤝' },
  물권총칙: { color: 'bg-slate-500', light: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: '📐' },
  물권변동: { color: 'bg-teal-500', light: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: '📝' },
  '점유·시효': { color: 'bg-yellow-500', light: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⏳' },
  물권적청구권: { color: 'bg-red-500', light: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🔒' },
  소유권: { color: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: '🏠' },
  용익물권: { color: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: '🌳' },
  유치권: { color: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: '🔐' },
  저당권: { color: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: '🏦' },
  계약총론: { color: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '📄' },
  매매: { color: 'bg-lime-500', light: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', icon: '💼' },
  교환: { color: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🔁' },
  임대차: { color: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: '🏢' },
  민사특별법: { color: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: '📜' },
}

const PALETTE_FALLBACK = [
  { color: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🏛️' },
]

export const CATEGORIES = CATEGORY_ORDER.map((name, i) => ({
  name,
  ...(STYLES[name] ?? PALETTE_FALLBACK[i % PALETTE_FALLBACK.length]),
}))

/** 카테고리순 정렬용 (목록에 없는 이름은 맨 뒤) */
export function categorySortIndex(name) {
  const i = CATEGORY_ORDER.indexOf(name)
  return i === -1 ? CATEGORY_ORDER.length : i
}
