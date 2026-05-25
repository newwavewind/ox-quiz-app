export const MAX_IMAGES = 5
export const MAX_VIDEOS = 1
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024

export const EMPTY_EXTRAS = {
  media: [],
  poll: null,
  youtube: null,
}

export function normalizeExtras(extras) {
  if (!extras || typeof extras !== 'object') return { ...EMPTY_EXTRAS }
  return {
    media: Array.isArray(extras.media) ? extras.media : [],
    poll: extras.poll && typeof extras.poll === 'object' ? extras.poll : null,
    youtube: extras.youtube && typeof extras.youtube === 'object' ? extras.youtube : null,
  }
}

export function hasExtrasContent(extras) {
  const e = normalizeExtras(extras)
  if (e.media.length > 0) return true
  if (e.youtube?.videoId) return true
  if (e.poll?.question?.trim() && e.poll.options?.filter(o => o.trim()).length >= 2) return true
  return false
}

export function parseYoutubeUrl(input) {
  const raw = (input || '').trim()
  if (!raw) return null
  let id = null
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`)
    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1).split('/')[0]
    } else if (url.hostname.includes('youtube.com')) {
      id = url.searchParams.get('v') || url.pathname.split('/').pop()
    }
  } catch {
    return null
  }
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null
  return {
    url: `https://www.youtube.com/watch?v=${id}`,
    videoId: id,
  }
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}

export function createEmptyPoll() {
  return {
    question: '',
    options: ['', ''],
    votes: {},
    votedBy: {},
  }
}

export function getPollTotals(poll) {
  const votes = poll?.votes ?? {}
  const total = Object.values(votes).reduce((s, n) => s + (Number(n) || 0), 0)
  return total
}

export function getVoterKey(user) {
  if (user?.id) return `u:${user.id}`
  try {
    let key = localStorage.getItem('ox_poll_voter')
    if (!key) {
      key = `g:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('ox_poll_voter', key)
    }
    return key
  } catch {
    return 'g:anon'
  }
}
