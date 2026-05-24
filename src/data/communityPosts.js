import { formatStudyTime } from './studyHistory'

const STORAGE_KEY = 'ox_quiz_community_v1'

/** @typedef {{ id: string, title: string, content: string, nickname: string, createdAt: number }} CommunityPost */

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

export function sortPostsNewest(posts) {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt)
}

export function createPostId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** @param {Omit<CommunityPost, 'id' | 'createdAt'> & { id?: string, createdAt?: number }} draft */
export function buildPost(draft) {
  return {
    id: draft.id ?? createPostId(),
    title: (draft.title || '').trim(),
    content: (draft.content || '').trim(),
    nickname: (draft.nickname || '익명').trim() || '익명',
    createdAt: draft.createdAt ?? Date.now(),
  }
}

export { formatStudyTime }
