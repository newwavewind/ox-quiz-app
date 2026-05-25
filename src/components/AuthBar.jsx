import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSupabase } from '../lib/supabase'

function displayName(user, profile) {
  const meta = user?.user_metadata
  return (
    profile?.display_name ||
    meta?.full_name ||
    meta?.name ||
    profile?.community_nickname ||
    user?.email?.split('@')[0] ||
    '사용자'
  )
}

function avatarUrl(user, profile) {
  return (
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null
  )
}

function UserAvatar({ src, name }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="w-8 h-8 rounded-full object-cover border border-emerald-200 shrink-0"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span
      className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 text-sm font-bold flex items-center justify-center shrink-0"
      aria-hidden
    >
      {initial}
    </span>
  )
}

export default function AuthBar() {
  const { user, loading, isConfigured, signInWithGoogle, signOut } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return undefined
    }

    const sb = getSupabase()
    if (!sb) return undefined

    let cancelled = false
    sb.from('ox_profiles')
      .select('display_name, community_nickname, avatar_url, email')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center">
        Supabase 환경 변수가 없습니다. <code className="font-mono">.env</code>를 설정하면 로그인·동기화가
        활성화됩니다.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs text-slate-500 text-center">
        로그인 상태 확인 중…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600">게스트 모드 · 진도는 이 기기에만 저장됩니다</p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="shrink-0 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          Google 로그인
        </button>
      </div>
    )
  }

  const name = displayName(user, profile)
  const email = profile?.email || user.email
  const photo = avatarUrl(user, profile)

  return (
    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <UserAvatar src={photo} name={name} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-950 truncate leading-tight">
            <span className="text-emerald-700 font-medium">로그인 · </span>
            {name}
          </p>
          {email && (
            <p className="text-[11px] text-emerald-700 truncate leading-tight mt-0.5">{email}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="shrink-0 rounded-lg bg-white border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 transition-colors"
      >
        로그아웃
      </button>
    </div>
  )
}
