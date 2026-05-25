import { useEffect, useRef } from 'react'
import {
  loadProfileAppearance,
  loadUserState,
  saveProfileAppearance,
  saveUserState,
} from '../data/supabaseUserState'

function hasProgressData(progress) {
  return progress && typeof progress === 'object' && Object.keys(progress).length > 0
}

function hasNotesData(notes) {
  return notes && typeof notes === 'object' && Object.keys(notes).length > 0
}

/**
 * 로그인 시 Supabase에서 진도·암기노트·설정을 불러오고, 변경 시 클라우드에 저장합니다.
 */
export function useCloudSync({
  user,
  isConfigured,
  progress,
  notes,
  appearance,
  setProgress,
  setNotes,
  setAppearance,
}) {
  const hydratedRef = useRef(false)
  const skipAppearanceSaveRef = useRef(false)

  useEffect(() => {
    if (!user || !isConfigured) {
      hydratedRef.current = false
      skipAppearanceSaveRef.current = false
      return undefined
    }

    let cancelled = false
    hydratedRef.current = false

    ;(async () => {
      const [remoteState, remoteAppearance] = await Promise.all([
        loadUserState(user.id),
        loadProfileAppearance(user.id),
      ])
      if (cancelled) return

      const remoteProgress = remoteState?.progress
      const remoteNotes = remoteState?.notes

      if (hasProgressData(remoteProgress) || hasNotesData(remoteNotes)) {
        if (hasProgressData(remoteProgress)) setProgress(remoteProgress)
        if (hasNotesData(remoteNotes)) setNotes(remoteNotes)
      } else {
        await saveUserState(user.id, { progress, notes })
      }

      if (remoteAppearance && typeof remoteAppearance === 'object') {
        skipAppearanceSaveRef.current = true
        setAppearance(prev => ({ ...prev, ...remoteAppearance }))
      }

      hydratedRef.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, isConfigured])

  useEffect(() => {
    if (!user || !isConfigured || !hydratedRef.current) return undefined

    const timer = setTimeout(() => {
      saveUserState(user.id, { progress, notes })
    }, 800)

    return () => clearTimeout(timer)
  }, [user?.id, isConfigured, progress, notes])

  useEffect(() => {
    if (!user || !isConfigured || !hydratedRef.current) return undefined
    if (skipAppearanceSaveRef.current) {
      skipAppearanceSaveRef.current = false
      return undefined
    }

    const timer = setTimeout(() => {
      saveProfileAppearance(user.id, appearance)
    }, 500)

    return () => clearTimeout(timer)
  }, [user?.id, isConfigured, appearance])
}
