export default function BottomNav({ active, onHome, onIndex, onStats }) {
  const tabClass = id =>
    `flex-1 py-3 text-sm font-semibold transition-colors ${
      active === id ? 'text-slate-800 border-t-2 border-slate-800 -mt-px' : 'text-slate-400'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        <button type="button" onClick={onHome} className={tabClass('home')}>
          1. 학습
        </button>
        <button type="button" onClick={onIndex} className={tabClass('index')}>
          2. 용어집
        </button>
        <button type="button" onClick={onStats} className={tabClass('stats')}>
          3. 통계
        </button>
      </div>
    </nav>
  )
}
