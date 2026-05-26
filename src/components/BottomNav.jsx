const TABS = [
  {
    id: 'home',
    label: '학습',
    Icon: IconStudy,
  },
  {
    id: 'exam',
    label: '시험',
    Icon: IconExam,
  },
  {
    id: 'notes',
    label: '암기노트',
    Icon: IconNotes,
  },
  {
    id: 'index',
    label: '용어집',
    Icon: IconGlossary,
  },
  {
    id: 'community',
    label: '커뮤니티',
    Icon: IconCommunity,
  },
]

function IconStudy({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 5.25h9a1.5 1.5 0 0 1 1.5 1.5v11.25a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V6.75a1.5 1.5 0 0 1 1.5-1.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 5.25V18.75" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 8.25l1.125 1.125-5.625 5.625-.5625 1.6875 1.6875-.5625 5.625-5.625Z"
      />
    </svg>
  )
}

function IconExam({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

function IconNotes({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125 16.862 4.487M6 18h.008v.008H6V18Z" />
    </svg>
  )
}

function IconGlossary({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5h13.5M5.25 10.75h13.5M5.25 14h13.5M5.25 17.25h9" />
    </svg>
  )
}

function IconCommunity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 9.75h7.5M8.25 12h7.5m-7.5 3h4.5M4.5 19.5l2.25-2.25h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 15.75 4.5h-7.5A2.25 2.25 0 0 0 6 6.75v10.5A2.25 2.25 0 0 0 8.25 19.5Z"
      />
    </svg>
  )
}

function NavTab({ id, label, Icon, active, onClick }) {
  const isActive = active === id
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] py-1.5 px-1 rounded-xl transition-colors touch-manipulation ${
        isActive
          ? 'text-slate-800 dark:text-slate-100 bg-slate-100/90 dark:bg-slate-700/80'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'stroke-[2]' : ''}`} />
      <span className={`text-[9px] sm:text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>
        {label}
      </span>
    </button>
  )
}

export default function BottomNav({ active, onHome, onExam, onIndex, onNotes, onCommunity }) {
  const handlers = {
    home: onHome,
    exam: onExam,
    notes: onNotes,
    index: onIndex,
    community: onCommunity,
  }

  return (
    <nav
      className="bottom-nav-fixed z-20 pointer-events-none"
      aria-label="주요 메뉴"
    >
      <div className="max-w-2xl mx-auto px-3 pb-3 pointer-events-auto">
        <div className="flex items-stretch gap-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg shadow-slate-900/10">
          {TABS.map(tab => (
            <NavTab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              Icon={tab.Icon}
              active={active}
              onClick={handlers[tab.id]}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
