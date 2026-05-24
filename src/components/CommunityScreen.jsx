import { useEffect, useMemo, useState } from 'react'
import { buildPost, formatStudyTime, sortPostsNewest } from '../data/communityPosts'

const PAGE_SIZE_OPTIONS = [
  { value: 5, label: '5개씩' },
  { value: 10, label: '10개씩' },
  { value: 30, label: '30개씩' },
  { value: 50, label: '50개씩' },
  { value: 'all', label: '전체 보기' },
]

function PostListItem({ post, onOpen }) {
  const preview =
    post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content

  return (
    <button
      type="button"
      onClick={() => onOpen(post.id)}
      className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{post.title}</p>
      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{preview}</p>
      <p className="text-[11px] text-slate-400 mt-2">
        <span className="text-slate-500 font-medium">{post.nickname}</span>
        {' · '}
        {formatStudyTime(post.createdAt)}
      </p>
    </button>
  )
}

function WriteForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem('ox_quiz_community_nick') || '익명'
    } catch {
      return '익명'
    }
  })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const t = title.trim()
    const c = content.trim()
    if (!t) {
      setError('제목을 입력하세요.')
      return
    }
    if (!c) {
      setError('내용을 입력하세요.')
      return
    }
    if (c.length < 2) {
      setError('내용을 2자 이상 입력하세요.')
      return
    }
    try {
      localStorage.setItem('ox_quiz_community_nick', nickname.trim() || '익명')
    } catch {
      /* ignore */
    }
    onSubmit(buildPost({ title: t, content: c, nickname }))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            placeholder="닉네임"
            className="w-full max-w-[8rem] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          placeholder="제목"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          autoFocus
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={8000}
          rows={14}
          placeholder="내용을 입력하세요"
          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-800 leading-relaxed resize-y min-h-[240px] focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <p className="text-[11px] text-slate-400 text-right tabular-nums">{content.length} / 8000</p>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
        >
          등록
        </button>
      </div>
    </form>
  )
}

export default function CommunityScreen({ posts, onAddPost, onDeletePost }) {
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => sortPostsNewest(posts), [posts])
  const selectedPost = useMemo(
    () => sorted.find(p => p.id === selectedId) ?? null,
    [sorted, selectedId]
  )

  const isAll = pageSize === 'all'
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize))

  const visiblePosts = useMemo(() => {
    if (isAll) return sorted
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize, isAll])

  const rangeStart = sorted.length === 0 ? 0 : isAll ? 1 : (page - 1) * pageSize + 1
  const rangeEnd = isAll ? sorted.length : Math.min(page * pageSize, sorted.length)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [pageSize, sorted.length])

  const openWrite = () => {
    setView('write')
    setSelectedId(null)
  }

  const openDetail = id => {
    setSelectedId(id)
    setView('detail')
  }

  const backToList = () => {
    setView('list')
    setSelectedId(null)
  }

  const handlePosted = post => {
    onAddPost(post)
    setSelectedId(post.id)
    setView('detail')
    setPage(1)
  }

  const handleDelete = () => {
    if (!selectedPost) return
    if (!window.confirm('이 글을 삭제할까요?')) return
    onDeletePost(selectedPost.id)
    backToList()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          {view !== 'list' && (
            <button
              type="button"
              onClick={backToList}
              className="shrink-0 p-1.5 text-slate-500 hover:text-slate-800"
              aria-label="목록으로"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800">
              {view === 'write' ? '글쓰기' : view === 'detail' ? '글보기' : '커뮤니티'}
            </h1>
            {view === 'list' && (
              <p className="text-xs text-slate-500 mt-0.5">공인중개사 민법 · 자유 게시판</p>
            )}
          </div>
          {view === 'list' && (
            <button
              type="button"
              onClick={openWrite}
              className="shrink-0 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
            >
              글쓰기
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col min-h-0">
        {view === 'write' && (
          <WriteForm onSubmit={handlePosted} onCancel={backToList} />
        )}

        {view === 'detail' && selectedPost && (
          <div className="flex-1 overflow-y-auto">
            <article className="bg-white border-b border-slate-200 px-4 py-4">
              <h2 className="text-lg font-bold text-slate-800 leading-snug">{selectedPost.title}</h2>
              <p className="text-xs text-slate-400 mt-2">
                <span className="font-medium text-slate-500">{selectedPost.nickname}</span>
                {' · '}
                {formatStudyTime(selectedPost.createdAt)}
              </p>
              <p className="mt-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedPost.content}
              </p>
            </article>
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {view === 'list' && (
          <>
            {sorted.length > 0 && (
              <div className="px-4 py-3 space-y-2 bg-slate-50 border-b border-slate-100">
                <div className="flex flex-wrap gap-1.5">
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setPageSize(opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        pageSize === opt.value
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {!isAll && sorted.length > pageSize && (
                  <p className="text-xs text-slate-500">
                    {rangeStart}–{rangeEnd} / {sorted.length}개 · {page} / {totalPages}페이지
                  </p>
                )}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-b-xl mx-0 overflow-hidden">
              {sorted.length === 0 ? (
                <div className="text-center py-16 px-4 text-slate-400">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-sm">아직 글이 없습니다.</p>
                  <p className="text-xs mt-2">오른쪽 위 「글쓰기」로 첫 글을 남겨 보세요.</p>
                </div>
              ) : (
                visiblePosts.map(post => (
                  <PostListItem key={post.id} post={post} onOpen={openDetail} />
                ))
              )}
            </div>

            {!isAll && totalPages > 1 && sorted.length > 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                >
                  이전
                </button>
                <span className="text-xs text-slate-500 tabular-nums min-w-[4rem] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
