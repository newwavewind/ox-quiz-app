export default function BottomNav({ active, onHome, onIndex, onNotes, onCommunity }) {
  const tabClass = id =>
    `flex-1 py-3 text-xs sm:text-sm font-semibold transition-colors ${
      active === id
        ? 'text-slate-800 dark:text-slate-100 border-t-2 border-slate-800 dark:border-slate-100 -mt-px'
        : 'text-slate-400 dark:text-slate-500'
    }`

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        <button type="button" onClick={onHome} className={tabClass('home')}>
          학습
        </button>
        <button type="button" onClick={onNotes} className={tabClass('notes')}>
          암기노트
        </button>
        <button type="button" onClick={onIndex} className={tabClass('index')}>
          용어집
        </button>
        <button type="button" onClick={onCommunity} className={tabClass('community')}>
          커뮤니티
        </button>
      </div>
    </nav>
  )
}
