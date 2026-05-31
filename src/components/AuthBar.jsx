import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSupabase } from '../lib/supabase'
import {
  loadLocalUserId,
  resolveUserId,
  saveLocalUserId,
} from '../data/userId'
import {
  loadProfileNickname,
  saveCommunityNickname,
} from '../data/supabaseUserState'
import { requestScrollToTop } from '../utils/scrollToTop'
import SettingsGearButton from './SettingsGearButton'
import SettingsSheet from './SettingsSheet'
import ExamDdayChip from './ExamDdayChip'
import ThemePickerMenu from './ThemePickerMenu'

export default function AuthBar({ appearance, onAppearanceChange }) {
  const { user, loading, isConfigured, signInWithGoogle, signOut } = useAuth()
  const [profileNick, setProfileNick] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [profileTick, setProfileTick] = useState(0)

  const refreshProfile = useCallback(() => {
    if (!user) {
      setProfileNick(null)
      return undefined
    }

    const sb = getSupabase()
    if (!sb) return undefined

    let cancelled = false
    loadProfileNickname(user.id).then(nick => {
      if (!cancelled) {
        setProfileNick(nick)
        if (nick && nick !== '익명') saveLocalUserId(nick)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => refreshProfile(), [refreshProfile, profileTick])

  const displayId = resolveUserId({
    profileNickname: profileNick,
    localId: loadLocalUserId(),
    email: user?.email,
  })

  const handleSaveUserId = async id => {
    const saved = saveLocalUserId(id)
    if (user) {
      const ok = await saveCommunityNickname(user.id, saved)
      if (ok) setProfileNick(saved)
    }
    setProfileTick(t => t + 1)
  }

  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center">
        Supabase 환경 변수가 없습니다. <code className="font-mono">.env</code>를 설정하면 로그인·동기화가
        활성화됩니다.
      </div>
    )
  }

  const settingsAvailable = appearance && onAppearanceChange

  const handleDesignThemeChange = next => {
    onAppearanceChange({
      ...appearance,
      designTheme: next,
    })
  }

  const toolbar = (
    <div className="flex items-center gap-1.5">
      <ExamDdayChip />
      {settingsAvailable && (
        <>
          <ThemePickerMenu
            designTheme={appearance.designTheme || 'theme1'}
            onChange={handleDesignThemeChange}
          />
          <SettingsGearButton
            onClick={() => setShowSettings(true)}
            className="p-1.5"
          />
        </>
      )}
      {loading ? null : user ? (
        <>
          <span
            className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-[6rem] truncate px-0.5"
            title={displayId}
          >
            {displayId}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Google 로그인
        </button>
      )}
    </div>
  )

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="맨 위로"
        onClick={requestScrollToTop}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            requestScrollToTop()
          }
        }}
        className="flex justify-end items-center px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 touch-manipulation"
      >
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          {toolbar}
        </div>
      </div>

      {showSettings && settingsAvailable && (
        <SettingsSheet
          settings={appearance}
          onChange={onAppearanceChange}
          onClose={() => setShowSettings(false)}
          userId={displayId === '익명' ? loadLocalUserId() : displayId}
          onUserIdChange={handleSaveUserId}
          canEditUserId
        />
      )}
    </>
  )
}
