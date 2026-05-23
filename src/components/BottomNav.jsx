export default function BottomNav({ active, onHome, onIndex }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        <button
          type="button"
          onClick={onHome}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            active === 'home'
              ? 'text-slate-800 border-t-2 border-slate-800 -mt-px'
              : 'text-slate-400'
          }`}
        >
          1. 학습
        </button>
        <button
          type="button"
          onClick={onIndex}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            active === 'index'
              ? 'text-slate-800 border-t-2 border-slate-800 -mt-px'
              : 'text-slate-400'
          }`}
        >
          2. 용어집
        </button>
      </div>
    </nav>
  )
}
