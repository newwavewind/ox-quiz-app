import { buildPost, sortPostsForBoard } from './communityPosts'
import { savePostMeta } from './communityPostMeta'
import {
  APP_GUIDE_NOTICE_ID,
  APP_GUIDE_NOTICE_TITLE,
  APP_GUIDE_NOTICE_VERSION,
  getAppGuideNoticeContent,
} from './appGuideNoticeContent'

const META_MARKER = `app_guide_v${APP_GUIDE_NOTICE_VERSION}`

export function buildAppGuideNoticePost() {
  return buildPost({
    id: APP_GUIDE_NOTICE_ID,
    title: APP_GUIDE_NOTICE_TITLE,
    content: getAppGuideNoticeContent(),
    nickname: '관리자',
    isNotice: true,
    isConcept: false,
    visibility: 'public',
    createdAt: new Date('2026-05-26T00:00:00+09:00').getTime(),
  })
}

function isGuidePost(post) {
  if (!post) return false
  if (post.id === APP_GUIDE_NOTICE_ID) return true
  if (post.title === APP_GUIDE_NOTICE_TITLE) return true
  return String(post.content || '').includes(META_MARKER)
}

/** 공지 설명서가 없거나 구버전이면 목록에 반영 */
export function ensureAppGuideNotice(posts) {
  const guide = buildAppGuideNoticePost()
  const existingIdx = posts.findIndex(isGuidePost)

  if (existingIdx >= 0) {
    const existing = posts[existingIdx]
    savePostMeta(existing.id, { isNotice: true, visibility: 'public' })
    if (existing.content === guide.content && existing.title === guide.title) {
      return posts
    }
    const next = [...posts]
    next[existingIdx] = {
      ...guide,
      id: existing.id,
      createdAt: existing.createdAt,
      authorId: existing.authorId,
    }
    savePostMeta(existing.id, { isNotice: true, visibility: 'public' })
    return sortPostsForBoard(next)
  }

  savePostMeta(guide.id, { isNotice: true, visibility: 'public' })
  return sortPostsForBoard([guide, ...posts])
}
