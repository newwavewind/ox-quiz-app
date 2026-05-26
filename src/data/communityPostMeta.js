const META_KEY = 'ox_quiz_community_meta_v1'

import { EMPTY_EXTRAS, normalizeExtras } from './communityExtras'

import { DEFAULT_BOARD, getPostBoard, normalizeBoard } from './communityBoards'

export const DEFAULT_POST_EXTRA = {
  isNotice: false,
  isConcept: false,
  board: DEFAULT_BOARD,
  visibility: 'public',
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  extras: EMPTY_EXTRAS,
}

function loadAllMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAllMeta(all) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function savePostMeta(postId, patch) {
  const all = loadAllMeta()
  all[postId] = { ...DEFAULT_POST_EXTRA, ...all[postId], ...patch }
  saveAllMeta(all)
}

export function getPostMeta(postId) {
  return { ...DEFAULT_POST_EXTRA, ...loadAllMeta()[postId] }
}

/** @param {import('./communityPosts').CommunityPost} post */
export function enrichPost(post) {
  const meta = getPostMeta(post.id)
  return {
    ...post,
    ...meta,
    extras: normalizeExtras(meta.extras ?? post.extras),
  }
}

export function enrichPosts(posts) {
  return posts.map(enrichPost)
}

export function incrementView(postId) {
  const meta = getPostMeta(postId)
  savePostMeta(postId, { viewCount: meta.viewCount + 1 })
}

export function incrementLike(postId) {
  const meta = getPostMeta(postId)
  savePostMeta(postId, { likeCount: meta.likeCount + 1 })
}

export function removePostMeta(postId) {
  const all = loadAllMeta()
  delete all[postId]
  saveAllMeta(all)
}

export function votePoll(postId, optionIndex, voterKey) {
  const meta = getPostMeta(postId)
  const poll = meta.extras?.poll
  if (!poll?.question?.trim()) return { ok: false, reason: 'no_poll' }

  const votedBy = { ...(poll.votedBy ?? {}) }
  if (votedBy[voterKey] !== undefined) {
    return { ok: false, reason: 'already_voted' }
  }

  const votes = { ...(poll.votes ?? {}) }
  const key = String(optionIndex)
  votes[key] = (votes[key] || 0) + 1
  votedBy[voterKey] = optionIndex

  savePostMeta(postId, {
    extras: {
      ...normalizeExtras(meta.extras),
      poll: { ...poll, votes, votedBy },
    },
  })
  return { ok: true }
}
