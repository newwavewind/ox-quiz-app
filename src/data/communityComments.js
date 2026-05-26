const STORAGE_KEY = 'ox_quiz_community_comments_v1'

/**
 * @typedef {Object} CommunityComment
 * @property {string} id
 * @property {string} postId
 * @property {string} nickname
 * @property {string} body
 * @property {number} createdAt
 * @property {number} [updatedAt]
 * @property {string} [authorId]
 */

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function getCommentsForPost(postId) {
  const list = loadAll()[postId]
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => a.createdAt - b.createdAt)
}

export function setCommentsForPost(postId, comments) {
  const all = loadAll()
  all[postId] = comments
  saveAll(all)
}

export function createCommentId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** @param {string} postId @param {Omit<CommunityComment, 'id' | 'postId' | 'createdAt'> & Partial<CommunityComment>} draft */
export function addLocalComment(postId, draft) {
  const comment = {
    id: draft.id ?? createCommentId(),
    postId,
    nickname: (draft.nickname || '익명').trim() || '익명',
    authorId: draft.authorId,
    body: (draft.body || '').trim(),
    createdAt: draft.createdAt ?? Date.now(),
    updatedAt: draft.updatedAt,
  }
  const list = getCommentsForPost(postId)
  setCommentsForPost(postId, [...list, comment])
  return comment
}

export function updateLocalComment(postId, commentId, body) {
  const list = getCommentsForPost(postId)
  const idx = list.findIndex(c => c.id === commentId)
  if (idx < 0) return null
  const next = {
    ...list[idx],
    body: body.trim(),
    updatedAt: Date.now(),
  }
  const updated = [...list]
  updated[idx] = next
  setCommentsForPost(postId, updated)
  return next
}

export function deleteLocalComment(postId, commentId) {
  const list = getCommentsForPost(postId)
  const next = list.filter(c => c.id !== commentId)
  setCommentsForPost(postId, next)
  return list.length !== next.length
}

export function removeCommentsForPost(postId) {
  const all = loadAll()
  delete all[postId]
  saveAll(all)
}

export function mergeCommentsForPost(postId, cloudComments) {
  const local = getCommentsForPost(postId)
  const byId = new Map(local.map(c => [c.id, c]))
  for (const c of cloudComments ?? []) {
    byId.set(c.id, c)
  }
  const merged = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
  setCommentsForPost(postId, merged)
  return merged
}

export function formatCommentDate(timestamp) {
  const d = new Date(timestamp)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${hh}:${mi}`
}
