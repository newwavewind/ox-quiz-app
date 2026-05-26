import { getSupabase } from '../lib/supabase'
import { normalizeBoard } from './communityBoards'
import { normalizeExtras } from './communityExtras'

function parseMeta(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return {
    isNotice: Boolean(raw.isNotice),
    isConcept: Boolean(raw.isConcept),
    board: normalizeBoard(raw.board),
    certYear: raw.certYear != null ? Number(raw.certYear) : undefined,
    visibility: raw.visibility ?? 'public',
    viewCount: Number(raw.viewCount) || 0,
    likeCount: Number(raw.likeCount) || 0,
    commentCount: Number(raw.commentCount) || 0,
    extras: normalizeExtras(raw.extras),
  }
}

/** @param {import('./communityPosts').CommunityPost} row */
export function mapRowToPost(row) {
  const meta = parseMeta(row.meta)
  return {
    id: row.id,
    title: row.title,
    content: row.body ?? row.content,
    nickname: row.nickname,
    authorId: row.author_id ?? row.authorId,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt ?? Date.now(),
    ...meta,
  }
}

function mapRowToComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    nickname: row.nickname,
    body: row.body,
    authorId: row.author_id ?? row.authorId,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt ?? Date.now(),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).getTime()
      : row.updatedAt,
  }
}

export async function fetchCommunityPosts() {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_community_posts')
    .select('id, author_id, nickname, title, body, created_at, meta')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ox] fetchCommunityPosts', error)
    return null
  }
  return (data ?? []).map(mapRowToPost)
}

export async function insertCommunityPost(authorId, post, meta = {}) {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_community_posts')
    .insert({
      author_id: authorId,
      nickname: post.nickname,
      title: post.title,
      body: post.content,
      meta,
    })
    .select('id, author_id, nickname, title, body, created_at, meta')
    .single()

  if (error) {
    console.error('[ox] insertCommunityPost', error)
    return null
  }
  return mapRowToPost(data)
}

export async function updateCommunityPostMeta(postId, meta) {
  const sb = getSupabase()
  if (!sb || !isCloudPostId(postId)) return false

  const { error } = await sb
    .from('ox_community_posts')
    .update({ meta })
    .eq('id', postId)

  if (error) {
    console.error('[ox] updateCommunityPostMeta', error)
    return false
  }
  return true
}

export async function deleteCommunityPost(postId) {
  const sb = getSupabase()
  if (!sb) return false

  const { error } = await sb.from('ox_community_posts').delete().eq('id', postId)
  if (error) {
    console.error('[ox] deleteCommunityPost', error)
    return false
  }
  return true
}

export async function fetchCommentsForPost(postId) {
  const sb = getSupabase()
  if (!sb || !isCloudPostId(postId)) return null

  const { data, error } = await sb
    .from('ox_community_comments')
    .select('id, post_id, author_id, nickname, body, created_at, updated_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ox] fetchCommentsForPost', error)
    return null
  }
  return (data ?? []).map(mapRowToComment)
}

export async function insertCommunityComment(authorId, postId, comment) {
  const sb = getSupabase()
  if (!sb || !isCloudPostId(postId)) return null

  const { data, error } = await sb
    .from('ox_community_comments')
    .insert({
      post_id: postId,
      author_id: authorId,
      nickname: comment.nickname,
      body: comment.body,
    })
    .select('id, post_id, author_id, nickname, body, created_at, updated_at')
    .single()

  if (error) {
    console.error('[ox] insertCommunityComment', error)
    return null
  }
  return mapRowToComment(data)
}

export async function updateCommunityComment(commentId, body) {
  const sb = getSupabase()
  if (!sb || !isCloudPostId(commentId)) return null

  const { data, error } = await sb
    .from('ox_community_comments')
    .update({ body })
    .eq('id', commentId)
    .select('id, post_id, author_id, nickname, body, created_at, updated_at')
    .single()

  if (error) {
    console.error('[ox] updateCommunityComment', error)
    return null
  }
  return mapRowToComment(data)
}

export async function deleteCommunityComment(commentId) {
  const sb = getSupabase()
  if (!sb || !isCloudPostId(commentId)) return false

  const { error } = await sb.from('ox_community_comments').delete().eq('id', commentId)
  if (error) {
    console.error('[ox] deleteCommunityComment', error)
    return false
  }
  return true
}

export function isCloudPostId(postId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    postId,
  )
}

export function isCloudCommentId(commentId) {
  return isCloudPostId(commentId)
}
