const STORAGE_KEY = 'ox_user_id'
const COMMUNITY_NICK_KEY = 'ox_quiz_community_nick'

export function loadLocalUserId() {
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function saveLocalUserId(id) {
  const value = (id || '').trim().slice(0, 20) || '익명'
  try {
    localStorage.setItem(STORAGE_KEY, value)
    localStorage.setItem(COMMUNITY_NICK_KEY, value)
  } catch {
    /* ignore */
  }
  return value
}

export function resolveUserId({ profileNickname, localId, email }) {
  const fromProfile = (profileNickname || '').trim()
  if (fromProfile && fromProfile !== '익명') return fromProfile
  const fromLocal = (localId || '').trim()
  if (fromLocal) return fromLocal
  if (email) return email.split('@')[0]
  return '익명'
}
