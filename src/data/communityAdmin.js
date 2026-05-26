import { getSupabase } from '../lib/supabase'

function parseAdminEmails() {
  const raw = import.meta.env.VITE_COMMUNITY_ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isEnvCommunityAdmin(email) {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return parseAdminEmails().includes(normalized)
}

export async function loadProfileIsAdmin(userId) {
  const sb = getSupabase()
  if (!sb || !userId) return false

  const { data, error } = await sb
    .from('ox_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[ox] loadProfileIsAdmin', error)
    return false
  }
  return Boolean(data?.is_admin)
}

/** 로그인 사용자가 커뮤니티 관리자(공지 등록)인지 */
export async function resolveCommunityAdmin(user) {
  if (!user) return false
  if (isEnvCommunityAdmin(user.email)) return true
  return loadProfileIsAdmin(user.id)
}
