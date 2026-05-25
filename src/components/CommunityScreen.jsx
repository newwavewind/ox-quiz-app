import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  buildPost,
  canViewPost,
  filterPostsByTab,
  formatBoardDate,
  searchPosts,
  sortPostsForBoard,
} from '../data/communityPosts'
import { enrichPosts, incrementLike, incrementView } from '../data/communityPostMeta'
import {
  EMPTY_EXTRAS,
  hasExtrasContent,
  PostExtrasContent,
  PostTitleBadges,
  WriteExtrasEditor,
} from './CommunityPostExtras'

const TABS = [
  { id: 'all', label: '전체글' },
  { id: 'concept', label: '개념글' },
  { id: 'notice', label: '공지' },
]

const SEARCH_TYPES = [
  { id: 'all', label: '제목+내용' },
  { id: 'title', label: '제목' },
  { id: 'content', label: '내용' },
  { id: 'author', label: '글쓴이' },
]

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10개씩 보기' },
  { value: 30, label: '30개씩 보기' },
  { value: 50, label: '50개씩 보기' },
  { value: 'all', label: '전체 보기' },
]

const VISIBILITY_OPTIONS = [
  { id: 'public', label: '전체공개' },
  { id: 'members', label: '회원공개' },
  { id: 'private', label: '비공개' },
]

function loadNickname() {
  try {
    return localStorage.getItem('ox_quiz_community_nick') || '익명'
  } catch {
    return '익명'
  }
}

function saveNickname(name) {
  try {
    localStorage.setItem('ox_quiz_community_nick', name)
  } catch {
    /* ignore */
  }
}

function LimeButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300 active:bg-lime-500 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function PillToggle({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-lime-400 border-lime-400 text-slate-900'
          : 'bg-white border-slate-200 text-slate-600 hover:border-lime-300'
      }`}
    >
      {children}
    </button>
  )
}

function WriteForm({ authorLabel, onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [extras, setExtras] = useState(EMPTY_EXTRAS)
  const [nickname, setNickname] = useState(authorLabel)
  const [editingNick, setEditingNick] = useState(false)
  const [visibility, setVisibility] = useState('public')
  const [isNotice, setIsNotice] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = e => {
    e.preventDefault()
    const t = title.trim()
    const c = content.trim()
    const nick = nickname.trim() || '익명'
    const poll = extras.poll
    const pollValid =
      poll?.question?.trim() &&
      poll.options.filter(o => o.trim()).length >= 2

    if (!t) {
      setError('제목을 입력하세요.')
      return
    }
    if ((!c || c.length < 2) && !hasExtrasContent(extras)) {
      setError('내용을 2자 이상 입력하거나 사진·투표·YouTube를 추가하세요.')
      return
    }
    if (poll && poll.question.trim() && !pollValid) {
      setError('투표는 질문과 항목 2개 이상을 입력하세요.')
      return
    }
    saveNickname(nick)
    onSubmit(
      buildPost({
        title: t,
        content: c,
        nickname: nick,
        visibility,
        isNotice,
        isConcept: false,
        extras: {
          ...extras,
          poll: pollValid
            ? {
                ...poll,
                votes: {},
                votedBy: {},
              }
            : null,
        },
      }),
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">글쓰기</h2>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 mb-6">
          <span>
            작성자: <strong className="text-slate-900">{editingNick ? '' : nickname}</strong>
          </span>
          {editingNick ? (
            <span className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setEditingNick(false)}
                className="text-lime-700 font-semibold text-sm"
              >
                확인
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditingNick(true)}
              className="text-lime-700 font-semibold text-sm hover:underline"
            >
              닉네임 변경
            </button>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-600 mb-1.5">제목</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 mb-5 focus:outline-none focus:ring-2 focus:ring-lime-300"
        />

        <label className="block text-sm font-medium text-slate-600 mb-1.5">내용</label>
        <div className="rounded-xl border border-slate-200 overflow-hidden mb-2">
          <WriteExtrasEditor extras={extras} onChange={setExtras} />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={8000}
            rows={14}
            placeholder="내용을 입력하세요..."
            className="w-full px-4 py-3 text-sm text-slate-800 leading-relaxed resize-y min-h-[220px] focus:outline-none"
          />
        </div>
        <p className="text-[11px] text-slate-400 text-right tabular-nums mb-6">{content.length} / 8000</p>

        <div className="flex flex-wrap items-center gap-4 mb-2">
          <span className="text-sm font-medium text-slate-600 shrink-0">공개</span>
          <div className="flex flex-wrap gap-2">
            {VISIBILITY_OPTIONS.map(opt => (
              <PillToggle
                key={opt.id}
                active={visibility === opt.id}
                onClick={() => setVisibility(opt.id)}
              >
                {opt.label}
              </PillToggle>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isNotice}
            onChange={e => setIsNotice(e.target.checked)}
            className="rounded border-slate-300 text-lime-600 focus:ring-lime-400"
          />
          공지 등록
        </label>

        {error && <p className="text-sm text-red-600 font-medium mt-4">{error}</p>}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-4 flex justify-end gap-2 max-w-3xl mx-auto w-full">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 rounded-full border border-lime-400 text-lime-800 font-semibold text-sm hover:bg-lime-50"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-8 py-2.5 rounded-full bg-lime-400 text-slate-900 font-bold text-sm hover:bg-lime-300"
        >
          저장
        </button>
      </div>
    </form>
  )
}

function PostDetail({ post, user, onBack, onDelete, onLike, canDelete }) {
  useEffect(() => {
    incrementView(post.id)
    onLike()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count once per post open
  }, [post.id])

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        {post.isNotice && (
          <span className="inline-block text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mb-2">
            공지
          </span>
        )}
        <h2 className="text-xl font-bold text-slate-900 leading-snug">{post.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{post.nickname}</span>
          <span>{formatBoardDate(post.createdAt)}</span>
          <span>조회 {post.viewCount + 1}</span>
          <span>추천 {post.likeCount}</span>
        </div>
        {post.content && (
          <p className="mt-6 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        <PostExtrasContent post={post} user={user} onMetaChange={onLike} />
      </article>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            incrementLike(post.id)
            onLike()
          }}
          className="px-4 py-2 rounded-full border border-lime-400 text-sm font-semibold text-lime-800 hover:bg-lime-50"
        >
          추천
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-semibold text-red-500 hover:text-red-700"
          >
            삭제
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 ml-auto"
        >
          목록
        </button>
      </div>
    </div>
  )
}

export default function CommunityScreen({ posts, onAddPost, onDeletePost }) {
  const { user } = useAuth()
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState('all')
  const [searchType, setSearchType] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [pageSize, setPageSize] = useState(30)
  const [page, setPage] = useState(1)
  const [metaTick, setMetaTick] = useState(0)
  const [nickname, setNickname] = useState(loadNickname)

  const enriched = useMemo(() => enrichPosts(posts), [posts, metaTick])
  const myNickname = nickname.trim() || '익명'
  const isLoggedIn = Boolean(user)

  const visiblePosts = useMemo(() => {
    let list = enriched.filter(p => canViewPost(p, isLoggedIn, user?.id, myNickname))
    list = filterPostsByTab(list, tab)
    list = searchPosts(list, appliedQuery, searchType)
    return sortPostsForBoard(list)
  }, [enriched, tab, appliedQuery, searchType, isLoggedIn, user?.id, myNickname])

  const selectedPost = useMemo(
    () => visiblePosts.find(p => p.id === selectedId) ?? enriched.find(p => p.id === selectedId) ?? null,
    [visiblePosts, enriched, selectedId],
  )

  const isAll = pageSize === 'all'
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(visiblePosts.length / pageSize))
  const pagePosts = useMemo(() => {
    if (isAll) return visiblePosts
    const start = (page - 1) * pageSize
    return visiblePosts.slice(start, start + pageSize)
  }, [visiblePosts, page, pageSize, isAll])

  const postNumbers = useMemo(() => {
    const map = new Map()
    let n = visiblePosts.filter(p => !p.isNotice).length
    for (const p of visiblePosts) {
      if (!p.isNotice) {
        map.set(p.id, n)
        n -= 1
      }
    }
    return map
  }, [visiblePosts])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [tab, appliedQuery, pageSize, visiblePosts.length])

  const bumpMeta = () => setMetaTick(t => t + 1)

  const runSearch = () => {
    setAppliedQuery(searchInput)
    setPage(1)
  }

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

  const handlePosted = async draft => {
    const saved = await onAddPost(draft)
    if (saved) {
      setSelectedId(saved.id)
      setView('detail')
      setPage(1)
      bumpMeta()
    }
  }

  const handleDelete = () => {
    if (!selectedPost) return
    if (!window.confirm('이 글을 삭제할까요?')) return
    onDeletePost(selectedPost.id)
    backToList()
  }

  const canDeletePost = post => {
    if (post.authorId && user) return post.authorId === user.id
    return post.nickname === myNickname
  }

  if (view === 'write') {
    return (
      <div className="min-h-screen bg-slate-50 pb-bottom-nav flex flex-col">
        <WriteForm
          authorLabel={myNickname}
          onSubmit={handlePosted}
          onCancel={backToList}
        />
      </div>
    )
  }

  if (view === 'detail' && selectedPost) {
    return (
      <div className="min-h-screen bg-slate-50 pb-bottom-nav flex flex-col">
        <PostDetail
          post={selectedPost}
          user={user}
          onBack={backToList}
          onDelete={handleDelete}
          onLike={bumpMeta}
          canDelete={canDeletePost(selectedPost)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-bottom-nav">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">커뮤니티</h1>
            <p className="text-sm text-slate-500 mt-1">전체 {visiblePosts.length}개</p>
          </div>
          <LimeButton onClick={openWrite} className="px-5 py-2 text-sm shrink-0">
            글쓰기
          </LimeButton>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap gap-1 px-3 pt-3 pb-2 border-b border-slate-100">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? 'bg-lime-400 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 px-3 py-3 border-b border-slate-100 bg-slate-50/50">
            <select
              value={searchType}
              onChange={e => setSearchType(e.target.value)}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {SEARCH_TYPES.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="제목+내용 검색"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-300"
            />
            <button
              type="button"
              onClick={runSearch}
              className="shrink-0 px-5 py-2 rounded-lg border border-lime-500 text-lime-800 text-sm font-semibold hover:bg-lime-50"
            >
              검색
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs">
                  <th className="w-14 py-2.5 font-medium">번호</th>
                  <th className="py-2.5 font-medium text-left pl-2">제목</th>
                  <th className="w-24 py-2.5 font-medium">글쓴이</th>
                  <th className="w-28 py-2.5 font-medium">작성일</th>
                  <th className="w-14 py-2.5 font-medium">조회</th>
                  <th className="w-14 py-2.5 font-medium">추천</th>
                </tr>
              </thead>
              <tbody>
                {pagePosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <p className="text-sm">
                        {appliedQuery ? '검색 결과가 없습니다.' : '등록된 글이 없습니다.'}
                      </p>
                      {!appliedQuery && (
                        <p className="text-xs mt-2">오른쪽 위 「글쓰기」로 첫 글을 남겨 보세요.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  pagePosts.map(post => {
                    const rowNum = postNumbers.get(post.id)

                    return (
                      <tr
                        key={post.id}
                        className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer ${
                          post.isNotice ? 'bg-amber-50/60' : ''
                        }`}
                        onClick={() => openDetail(post.id)}
                      >
                        <td className="py-3 text-center align-middle">
                          {post.isNotice ? (
                            <span className="text-xs font-bold text-amber-700">공지</span>
                          ) : (
                            <span className="text-slate-500 tabular-nums">{rowNum}</span>
                          )}
                        </td>
                        <td className="py-3 pl-2 pr-2 align-middle">
                          <span className="font-medium text-slate-800 line-clamp-1">
                            {post.commentCount > 0 && (
                              <span className="text-lime-700 font-bold mr-1">
                                [{post.commentCount}]
                              </span>
                            )}
                            <PostTitleBadges extras={post.extras} />
                            {post.title}
                          </span>
                        </td>
                        <td className="py-3 text-center text-slate-600 align-middle truncate max-w-[6rem]">
                          {post.nickname}
                        </td>
                        <td className="py-3 text-center text-slate-500 text-xs align-middle tabular-nums">
                          {formatBoardDate(post.createdAt)}
                        </td>
                        <td className="py-3 text-center text-slate-500 align-middle tabular-nums">
                          {post.viewCount}
                        </td>
                        <td className="py-3 text-center text-slate-500 align-middle tabular-nums">
                          {post.likeCount}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 border-t border-slate-100 bg-slate-50/30">
            <select
              value={pageSize}
              onChange={e => {
                const v = e.target.value
                setPageSize(v === 'all' ? 'all' : Number(v))
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {!isAll && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-50"
                  aria-label="이전"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 7) {
                    const start = Math.max(1, Math.min(page - 3, totalPages - 6))
                    pageNum = start + i
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm font-semibold ${
                        page === pageNum
                          ? 'bg-lime-400 text-slate-900'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-50"
                  aria-label="다음"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
