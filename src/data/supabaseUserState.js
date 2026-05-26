import { getSupabase } from '../lib/supabase'

export async function loadUserState(userId) {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_user_state')
    .select('progress, notes, past_exam_rounds')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ox] loadUserState', error)
    return null
  }
  return data
}

export async function saveUserState(userId, { progress, notes, pastExamRounds }) {
  const sb = getSupabase()
  if (!sb) return false

  const payload = {
    user_id: userId,
    progress: progress ?? {},
    notes: notes ?? {},
    updated_at: new Date().toISOString(),
  }
  if (pastExamRounds !== undefined) {
    payload.past_exam_rounds = pastExamRounds ?? {}
  }

  const { error } = await sb.from('ox_user_state').upsert(payload)

  if (error) {
    console.error('[ox] saveUserState', error)
    return false
  }
  return true
}

export async function loadProfileAppearance(userId) {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_profiles')
    .select('appearance_settings')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ox] loadProfileAppearance', error)
    return null
  }
  return data?.appearance_settings ?? null
}

export async function saveCommunityNickname(userId, nickname) {
  const sb = getSupabase()
  if (!sb) return false

  const value = (nickname || '').trim().slice(0, 20) || '익명'
  const { error } = await sb
    .from('ox_profiles')
    .update({
      community_nickname: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[ox] saveCommunityNickname', error)
    return false
  }
  return true
}

export async function loadProfileNickname(userId) {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_profiles')
    .select('community_nickname')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ox] loadProfileNickname', error)
    return null
  }
  return data?.community_nickname ?? null
}

export async function saveProfileAppearance(userId, appearance) {
  const sb = getSupabase()
  if (!sb) return false

  const { error } = await sb
    .from('ox_profiles')
    .update({
      appearance_settings: appearance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[ox] saveProfileAppearance', error)
    return false
  }
  return true
}
