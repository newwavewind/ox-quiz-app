import { formatStudyTime } from './studyHistory'
import { DEFAULT_POST_EXTRA } from './communityPostMeta'

const STORAGE_KEY = 'ox_quiz_community_v1'

/**
 * @typedef {Object} CommunityPost
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {string} nickname
 * @property {number} createdAt
 * @property {string} [authorId]
 * @property {boolean} [isNotice]
 * @property {boolean} [isConcept]
 * @property {'public'|'members'|'private'} [visibility]
 * @property {number} [viewCount]
 * @property {number} [likeCount]
 * @property {number} [commentCount]
 */

export function loadCommunityPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCommunityPosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export function sortPostsForBoard(posts) {
  return [...posts].sort((a, b) => {
    if (a.isNotice && !b.isNotice) return -1
    if (!a.isNotice && b.isNotice) return 1
    return b.createdAt - a.createdAt
  })
}

export function createPostId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function formatBoardDate(timestamp) {
  const d = new Date(timestamp)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}. ${mm}. ${dd}.`
}

const SEARCH_FIELDS = {
  all: (post, q) =>
    post.title.toLowerCase().includes(q) ||
    post.content.toLowerCase().includes(q) ||
    post.nickname.toLowerCase().includes(q),
  title: (post, q) => post.title.toLowerCase().includes(q),
  content: (post, q) => post.content.toLowerCase().includes(q),
  author: (post, q) => post.nickname.toLowerCase().includes(q),
}

export function filterPostsByTab(posts, tab) {
  if (tab === 'notice') return posts.filter(p => p.isNotice)
  if (tab === 'concept') return posts.filter(p => p.isConcept)
  return posts
}

export function searchPosts(posts, query, field = 'all') {
  const q = query.trim().toLowerCase()
  if (!q) return posts
  const fn = SEARCH_FIELDS[field] ?? SEARCH_FIELDS.all
  return posts.filter(p => fn(p, q))
}

/** @param {boolean} isLoggedIn */
export function canViewPost(post, isLoggedIn, userId, myNickname) {
  if (post.visibility === 'private') {
    if (post.authorId && userId) return post.authorId === userId
    return isLoggedIn && post.nickname === myNickname
  }
  if (post.visibility === 'members') return isLoggedIn
  return true
}

/** @param {Omit<CommunityPost, 'id' | 'createdAt'> & Partial<CommunityPost>} draft */
export function buildPost(draft) {
  return {
    ...DEFAULT_POST_EXTRA,
    id: draft.id ?? createPostId(),
    title: (draft.title || '').trim(),
    content: (draft.content || '').trim(),
    nickname: (draft.nickname || '익명').trim() || '익명',
    createdAt: draft.createdAt ?? Date.now(),
    authorId: draft.authorId,
    isNotice: Boolean(draft.isNotice),
    isConcept: Boolean(draft.isConcept),
    visibility: draft.visibility ?? 'public',
    viewCount: draft.viewCount ?? 0,
    likeCount: draft.likeCount ?? 0,
    commentCount: draft.commentCount ?? 0,
  }
}

export function pickMetaFields(post) {
  return {
    isNotice: post.isNotice,
    isConcept: post.isConcept,
    visibility: post.visibility,
    viewCount: post.viewCount,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    extras: post.extras,
  }
}

export { formatStudyTime }
