import { getSupabase } from '../lib/supabase'

/** @param {import('./communityPosts').CommunityPost} row */
export function mapRowToPost(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.body ?? row.content,
    nickname: row.nickname,
    authorId: row.author_id ?? row.authorId,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt ?? Date.now(),
  }
}

export async function fetchCommunityPosts() {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_community_posts')
    .select('id, nickname, title, body, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ox] fetchCommunityPosts', error)
    return null
  }
  return (data ?? []).map(mapRowToPost)
}

export async function insertCommunityPost(authorId, post) {
  const sb = getSupabase()
  if (!sb) return null

  const { data, error } = await sb
    .from('ox_community_posts')
    .insert({
      author_id: authorId,
      nickname: post.nickname,
      title: post.title,
      body: post.content,
    })
    .select('id, nickname, title, body, created_at')
    .single()

  if (error) {
    console.error('[ox] insertCommunityPost', error)
    return null
  }
  return mapRowToPost(data)
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

export function isCloudPostId(postId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    postId,
  )
}
