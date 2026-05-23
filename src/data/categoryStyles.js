import taxonomy from '../../data/taxonomy.json'

const PALETTE = [
  { color: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '⚖️' },
  { color: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '📋' },
  { color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '🤝' },
  { color: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🏛️' },
  { color: 'bg-teal-500', light: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', icon: '📝' },
  { color: 'bg-red-500', light: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🔒' },
  { color: 'bg-yellow-500', light: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⏳' },
  { color: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: '🏠' },
  { color: 'bg-pink-500', light: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', icon: '🌳' },
  { color: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: '🔐' },
  { color: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '📄' },
  { color: 'bg-lime-500', light: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', icon: '💼' },
  { color: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: '🏢' },
  { color: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: '📜' },
]

const LEGACY = {
  법률행위총론: PALETTE[0],
  법률행위부관: PALETTE[1],
  대리: PALETTE[2],
  물권일반: PALETTE[3],
  물권변동등기: PALETTE[4],
  물권적청구권: PALETTE[5],
  점유권취득시효: PALETTE[6],
  소유권: PALETTE[7],
  용익물권: PALETTE[8],
  보물권: PALETTE[9],
  계약총론: PALETTE[10],
  매매: PALETTE[11],
  임대차: PALETTE[12],
  특별법: PALETTE[13],
}

const orderedNames = []
const seen = new Set()
for (const u of taxonomy.units) {
  if (!seen.has(u.category)) {
    seen.add(u.category)
    orderedNames.push(u.category)
  }
}

export const CATEGORIES = orderedNames.map((name, i) => ({
  name,
  ...(LEGACY[name] ?? PALETTE[i % PALETTE.length]),
}))
