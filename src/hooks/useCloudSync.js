import { useEffect, useRef } from 'react'
import {
  loadProfileAppearance,
  loadUserState,
  saveProfileAppearance,
  saveUserState,
} from '../data/supabaseUserState'
import {
  exportAllPastExamRounds,
  mergeCloudPastExamRounds,
  setPastExamRoundsSyncCallback,
} from '../data/pastExamRounds'

function hasProgressData(progress) {
  return progress && typeof progress === 'object' && Object.keys(progress).length > 0
}

function hasNotesData(notes) {
  return notes && typeof notes === 'object' && Object.keys(notes).length > 0
}

function hasPastExamRoundsData(data) {
  return data && typeof data === 'object' && Object.keys(data).length > 0
}

/**
 * 로그인 시 Supabase에서 진도·암기노트·5회독·설정을 불러오고, 변경 시 클라우드에 저장합니다.
 */
export function useCloudSync({
  user,
  isConfigured,
  progress,
  notes,
  appearance,
  examYears,
  setProgress,
  setNotes,
  setAppearance,
}) {
  const hydratedRef = useRef(false)
  const skipAppearanceSaveRef = useRef(false)
  const pastExamRoundsRef = useRef({})

  useEffect(() => {
    setPastExamRoundsSyncCallback(data => {
      pastExamRoundsRef.current = data ?? {}
      if (user && isConfigured && hydratedRef.current) {
        saveUserState(user.id, {
          progress,
          notes,
          pastExamRounds: pastExamRoundsRef.current,
        })
      }
    })
    return () => setPastExamRoundsSyncCallback(null)
  }, [user?.id, isConfigured, progress, notes])

  useEffect(() => {
    if (!examYears?.length) return
    pastExamRoundsRef.current = exportAllPastExamRounds(examYears)
  }, [examYears])

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
      const remotePastExamRounds = remoteState?.past_exam_rounds

      if (hasProgressData(remoteProgress) || hasNotesData(remoteNotes)) {
        if (hasProgressData(remoteProgress)) setProgress(remoteProgress)
        if (hasNotesData(remoteNotes)) setNotes(remoteNotes)
      } else {
        await saveUserState(user.id, {
          progress,
          notes,
          pastExamRounds: exportAllPastExamRounds(examYears),
        })
      }

      if (hasPastExamRoundsData(remotePastExamRounds)) {
        mergeCloudPastExamRounds(remotePastExamRounds, examYears)
        pastExamRoundsRef.current = exportAllPastExamRounds(examYears)
      } else if (examYears?.length) {
        pastExamRoundsRef.current = exportAllPastExamRounds(examYears)
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
      saveUserState(user.id, {
        progress,
        notes,
        pastExamRounds: pastExamRoundsRef.current,
      })
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
