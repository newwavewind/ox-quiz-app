import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import BomGichulWordmark from './BomGichulWordmark'
import {
  buildPost,
  canViewPost,
  filterPostsByTab,
  formatBoardDate,
  searchPosts,
  sortPostsForTab,
} from '../data/communityPosts'
import { enrichPosts, incrementLike, incrementView } from '../data/communityPostMeta'
import { formatCommentDate } from '../data/communityComments'
import { isCloudPostId } from '../data/supabaseCommunity'
import {
  EMPTY_EXTRAS,
  hasExtrasContent,
  PostExtrasContent,
  PostTitleBadges,
  WriteExtrasEditor,
} from './CommunityPostExtras'
import CommunityRichEditor, {
  getContentPlainText,
  getContentTextLength,
} from './CommunityRichEditor'
import { resolveCommunityAdmin } from '../data/communityAdmin'
import {
  boardFromTab,
  COMMUNITY_BOARDS,
  getBoardConfig,
  getPostBoard,
  isRecommendedPost,
  normalizeBoard,
  RECOMMENDED_LIKE_MIN,
} from '../data/communityBoards'
import { normalizeExtras } from '../data/communityExtras'
import { hasRichHtml, sanitizePostHtml } from '../utils/communityRichText'
import { getBrokerExamDdayInfo } from '../data/examDday'
import {
  buildRound5CertDraft,
  buildRoundScoresAutoText,
  composeRound5CertContent,
  consumeRound5CertWriteIntent,
  extractRound5CertFreePlain,
  getRound5CertEligibleYears,
  isRound5Completed,
  plainTextToEditorHtml,
  ROUND5_CERT_FREE_WRITE_SEPARATOR,
} from '../data/round5Cert'

const TABS = [
  { id: 'all', label: '전체글' },
  { id: 'recommended', label: '추천글' },
  { id: 'round5_cert', label: '5회독 인증' },
  { id: 'qa', label: 'Q&A' },
  { id: 'error_report', label: '오류신고' },
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

function ExamDdayChip() {
  const info = useMemo(() => getBrokerExamDdayInfo(), [])

  return (
    <div
      className="inline-flex h-9 flex-col items-end justify-center rounded-xl border border-lime-300 bg-lime-50 px-2.5 shrink-0"
      title={`${info.title} ${info.examDateLabel}`}
    >
      <span className="text-[10px] font-semibold text-lime-800/80 leading-none">
        {info.roundLabel} {info.title}
      </span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-sm font-bold text-slate-900 tabular-nums leading-none">
          {info.ddayLabel}
        </span>
        <span className="text-[10px] font-medium text-slate-500 tabular-nums leading-none">
          {info.examDateLabel}
        </span>
      </div>
    </div>
  )
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

function RecommendedBadge({ className = '' }) {
  return (
    <span
      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mr-1 align-middle text-emerald-700 bg-emerald-50 border-emerald-200 ${className}`}
    >
      추천
    </span>
  )
}

function BoardBadge({ boardId, className = '' }) {
  const board = getBoardConfig(boardId)
  if (!board || boardId === 'general') return null
  return (
    <span
      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border mr-1 align-middle ${
        board.listBadgeClass ?? 'text-slate-600 bg-slate-50 border-slate-200'
      } ${className}`}
    >
      {board.shortLabel ?? board.label}
    </span>
  )
}

function WriteForm({
  authorLabel,
  defaultBoard = 'general',
  writePrefill = null,
  editPost = null,
  round5CertYears = [],
  onSubmit,
  onCancel,
  canPostNotice = false,
}) {
  const isEdit = Boolean(editPost)
  const editBoard = editPost ? getPostBoard(editPost) : defaultBoard
  const lockRound5Board = isEdit ? editBoard === 'round5_cert' : defaultBoard === 'round5_cert'

  const [title, setTitle] = useState(() => {
    if (editPost) return editPost.title ?? ''
    return writePrefill?.title ?? ''
  })
  const [content, setContent] = useState(() => {
    if (editPost) {
      if (editBoard === 'round5_cert') return ''
      if (hasRichHtml(editPost.content)) return editPost.content
      return editPost.content ? plainTextToEditorHtml(editPost.content) : ''
    }
    if (lockRound5Board || writePrefill?.certYear) return ''
    return writePrefill?.content ? plainTextToEditorHtml(writePrefill.content) : ''
  })
  const [freeContent, setFreeContent] = useState(() => {
    if (editPost && editBoard === 'round5_cert') {
      return plainTextToEditorHtml(extractRound5CertFreePlain(editPost.content ?? ''))
    }
    if (!writePrefill?.content) return ''
    if (lockRound5Board || writePrefill?.certYear) {
      return plainTextToEditorHtml(extractRound5CertFreePlain(writePrefill.content))
    }
    return ''
  })
  const [extras, setExtras] = useState(() =>
    editPost ? normalizeExtras(editPost.extras) : EMPTY_EXTRAS,
  )
  const [nickname, setNickname] = useState(authorLabel)
  const [editingNick, setEditingNick] = useState(false)
  const [visibility, setVisibility] = useState(editPost?.visibility ?? 'public')
  const [board, setBoard] = useState(isEdit ? editBoard : defaultBoard)
  const [certYear, setCertYear] = useState(
    editPost?.certYear ??
      writePrefill?.certYear ??
      (lockRound5Board ? round5CertYears[0] ?? null : null),
  )
  const [isNotice, setIsNotice] = useState(Boolean(editPost?.isNotice))
  const [error, setError] = useState('')
  const editorRef = useRef(null)

  const boardConfig = getBoardConfig(board)
  const isRound5CertWrite = board === 'round5_cert' && Boolean(certYear)
  const writableBoards = COMMUNITY_BOARDS.filter(
    b => b.id !== 'round5_cert' || round5CertYears.length > 0,
  )

  const syncEditor = () => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    const next = html === '<br>' ? '' : html
    if (isRound5CertWrite) setFreeContent(next)
    else setContent(next)
  }

  useEffect(() => {
    if (board !== 'round5_cert' || !certYear) return
    setTitle(prev => {
      const expected = `${certYear}년 5회독 완료 인증`
      const trimmed = prev.trim()
      if (!trimmed || /^\d{4}년 5회독 완료 인증$/.test(trimmed)) return expected
      return prev
    })
  }, [certYear, board])

  const handleSubmit = e => {
    e.preventDefault()
    const t = title.trim()
    const c =
      board === 'round5_cert' && certYear
        ? composeRound5CertContent(certYear, getContentPlainText(freeContent))
        : getContentPlainText(content)
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
      setError('내용을 2자 이상 입력하거나 사진·투표를 추가하세요.')
      return
    }
    if (poll && poll.question.trim() && !pollValid) {
      setError('투표는 질문과 항목 2개 이상을 입력하세요.')
      return
    }
    const postBoard = isNotice ? 'general' : board
    if (postBoard === 'round5_cert') {
      if (!certYear || !isRound5Completed(certYear)) {
        setError('기출 5회독을 완료한 연도만 인증할 수 있습니다.')
        return
      }
    }
    saveNickname(nick)
    const pollPatch = pollValid
      ? {
          ...poll,
          votes: editPost?.extras?.poll?.votes ?? {},
          votedBy: editPost?.extras?.poll?.votedBy ?? {},
        }
      : null
    const nextExtras = {
      ...extras,
      poll: pollPatch,
    }
    onSubmit(
      buildPost({
        ...(editPost ?? {}),
        title: t,
        content: c,
        nickname: nick,
        visibility: isEdit ? editPost.visibility : visibility,
        board: isEdit ? normalizeBoard(getPostBoard(editPost)) : postBoard,
        certYear: (isEdit ? getPostBoard(editPost) : postBoard) === 'round5_cert' ? certYear : undefined,
        isNotice: isEdit ? Boolean(editPost.isNotice) : canPostNotice && isNotice,
        extras: nextExtras,
      }),
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{isEdit ? '글 수정' : '글쓰기'}</h2>

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

        <div className="mb-5">
          <span className="block text-sm font-medium text-slate-600 mb-2">게시판</span>
          {isEdit ? (
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
              {boardConfig.label}
              {editPost?.isNotice ? ' · 공지' : ''}
            </p>
          ) : lockRound5Board ? (
            <p className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              5회독 인증
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {writableBoards.map(opt => (
                <PillToggle
                  key={opt.id}
                  active={board === opt.id && !isNotice}
                  onClick={() => {
                    setBoard(opt.id)
                    setIsNotice(false)
                    if (opt.id !== 'round5_cert') setCertYear(null)
                    else if (!certYear && round5CertYears[0]) setCertYear(round5CertYears[0])
                  }}
                >
                  {opt.label}
                </PillToggle>
              ))}
            </div>
          )}
          {board === 'round5_cert' && (
            <div className="mt-3">
              <span className="block text-sm font-medium text-slate-600 mb-1.5">인증 연도</span>
              {round5CertYears.length === 0 ? (
                <p className="text-xs text-rose-600">5회독을 완료한 연도가 없습니다. 시험 탭에서 5회독을 먼저 완료하세요.</p>
              ) : round5CertYears.length === 1 ? (
                <p className="text-sm font-semibold text-emerald-800">{round5CertYears[0]}년</p>
              ) : (
                <select
                  value={certYear ?? ''}
                  onChange={e => setCertYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {round5CertYears.map(y => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">{boardConfig.description}</p>
          <p className="text-[11px] text-slate-400 mt-1">{boardConfig.contentHint}</p>
        </div>

        <label className="block text-sm font-medium text-slate-600 mb-1.5">제목</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          placeholder={boardConfig.titlePlaceholder}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 mb-5 focus:outline-none focus:ring-2 focus:ring-lime-300"
        />

        <label className="block text-sm font-medium text-slate-600 mb-1.5">내용</label>
        <div className="rounded-xl border border-slate-200 overflow-hidden mb-2">
          <WriteExtrasEditor
            extras={extras}
            onChange={setExtras}
            editorRef={editorRef}
            onEditorSync={syncEditor}
          />
          {isRound5CertWrite && (
            <>
              <div
                className="px-4 py-3 text-sm text-slate-700 leading-relaxed bg-slate-50 border-t border-slate-100 whitespace-pre-wrap select-none"
                aria-readonly="true"
              >
                {buildRoundScoresAutoText(certYear)}
              </div>
              <div
                className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50 text-center tracking-widest select-none"
                aria-hidden
              >
                {ROUND5_CERT_FREE_WRITE_SEPARATOR}
              </div>
            </>
          )}
          <CommunityRichEditor
            value={isRound5CertWrite ? freeContent : content}
            onChange={isRound5CertWrite ? setFreeContent : setContent}
            editorRef={editorRef}
            maxLength={8000}
            placeholder={
              isRound5CertWrite ? '구분선 아래에 소감 등을 자유롭게 작성하세요.' : undefined
            }
            className={isRound5CertWrite ? 'min-h-[160px]' : ''}
          />
        </div>
        <p className="text-[11px] text-slate-400 text-right tabular-nums mb-6">
          {getContentTextLength(isRound5CertWrite ? freeContent : content)} / 8000
          {isRound5CertWrite ? ' · 회독 점수는 자동 입력(수정 불가)' : ''}
        </p>

        {!isEdit && (
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
        )}

        {!isEdit && canPostNotice && (
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isNotice}
              onChange={e => setIsNotice(e.target.checked)}
              className="rounded border-slate-300 text-lime-600 focus:ring-lime-400"
            />
            공지 등록 (공지는 전체글·공지 탭에 표시)
          </label>
        )}

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

function PostComments({
  post,
  user,
  myNickname,
  onLoadComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')

  const cloudPost = isCloudPostId(post.id)
  const canWrite = !cloudPost || Boolean(user)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    onLoadComments(post.id).then(list => {
      if (!cancelled) {
        setComments(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [post.id, onLoadComments])

  const canEditComment = comment => {
    if (comment.authorId && user) return comment.authorId === user.id
    return comment.nickname === myNickname
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const text = body.trim()
    if (!text || submitting || !canWrite) return
    setSubmitting(true)
    const saved = await onAddComment(post.id, text, myNickname)
    if (saved) {
      setComments(await onLoadComments(post.id))
      setBody('')
    }
    setSubmitting(false)
  }

  const startEdit = comment => {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditBody('')
  }

  const saveEdit = async commentId => {
    const text = editBody.trim()
    if (!text) return
    const saved = await onUpdateComment(post.id, commentId, text)
    if (saved) {
      setComments(await onLoadComments(post.id))
      cancelEdit()
    }
  }

  const handleDelete = async commentId => {
    if (!window.confirm('댓글을 삭제할까요?')) return
    const ok = await onDeleteComment(post.id, commentId)
    if (ok) setComments(await onLoadComments(post.id))
  }

  return (
    <section className="mt-8 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-bold text-slate-800">
        댓글 {comments.length > 0 ? comments.length : ''}
      </h3>
      {loading ? (
        <p className="mt-3 text-xs text-slate-400">댓글 불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comments.map(comment => (
            <li key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{comment.nickname}</span>
                <span>{formatCommentDate(comment.updatedAt ?? comment.createdAt)}</span>
                {canEditComment(comment) && editingId !== comment.id && (
                  <span className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(comment)}
                      className="font-semibold text-slate-500 hover:text-slate-800"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="font-semibold text-red-500 hover:text-red-700"
                    >
                      삭제
                    </button>
                  </span>
                )}
              </div>
              {editingId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(comment.id)}
                      className="px-3 py-1.5 rounded-lg bg-lime-500 text-white text-xs font-semibold"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap">{comment.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="댓글을 입력하세요"
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="px-4 py-2 rounded-full bg-lime-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? '등록 중…' : '댓글 등록'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-slate-500">댓글 작성은 로그인 후 가능합니다.</p>
      )}
    </section>
  )
}

function PostDetail({
  post,
  user,
  myNickname,
  onBack,
  onEdit,
  onDelete,
  onLike,
  onSyncPostMeta,
  canEdit,
  canDelete,
  onLoadComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}) {
  useEffect(() => {
    incrementView(post.id)
    onLike()
    onSyncPostMeta?.(post.id)
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
        {!post.isNotice && isRecommendedPost(post) && (
          <RecommendedBadge className="mb-2" />
        )}
        {!post.isNotice && getPostBoard(post) !== 'general' && (
          <BoardBadge boardId={getPostBoard(post)} className="mb-2" />
        )}
        <h2 className="text-xl font-bold text-slate-900 leading-snug">{post.title}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{post.nickname}</span>
          <span>{formatBoardDate(post.createdAt)}</span>
          <span>조회 {post.viewCount + 1}</span>
          <span>추천 {post.likeCount}</span>
        </div>
        {post.content && (
          <div
            className={`mt-6 text-sm text-slate-800 leading-relaxed ${
              hasRichHtml(post.content) ? 'community-post-body' : 'whitespace-pre-wrap'
            }`}
            {...(hasRichHtml(post.content)
              ? { dangerouslySetInnerHTML: { __html: sanitizePostHtml(post.content) } }
              : { children: post.content })}
          />
        )}
        <PostExtrasContent
          post={post}
          user={user}
          onMetaChange={() => {
            onLike()
            onSyncPostMeta?.(post.id)
          }}
        />
        <PostComments
          post={post}
          user={user}
          myNickname={myNickname}
          onLoadComments={onLoadComments}
          onAddComment={onAddComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      </article>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            incrementLike(post.id)
            onLike()
            onSyncPostMeta?.(post.id)
          }}
          className="px-4 py-2 rounded-full border border-lime-400 text-sm font-semibold text-lime-800 hover:bg-lime-50"
        >
          추천
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            수정
          </button>
        )}
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

export default function CommunityScreen({
  posts,
  onAddPost,
  onUpdatePost,
  onDeletePost,
  onSyncPostMeta,
  onLoadComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  examYears = [],
}) {
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
  const [writeBoard, setWriteBoard] = useState('general')
  const [writePrefill, setWritePrefill] = useState(null)
  const [nickname, setNickname] = useState(loadNickname)
  const [isCommunityAdmin, setIsCommunityAdmin] = useState(false)

  const round5CertYears = useMemo(() => getRound5CertEligibleYears(examYears), [examYears])
  const canWriteRound5Cert = round5CertYears.length > 0

  const enriched = useMemo(() => enrichPosts(posts), [posts, metaTick])
  const myNickname = nickname.trim() || '익명'
  const isLoggedIn = Boolean(user)

  const visiblePosts = useMemo(() => {
    let list = enriched.filter(p => canViewPost(p, isLoggedIn, user?.id, myNickname))
    list = filterPostsByTab(list, tab)
    list = searchPosts(list, appliedQuery, searchType)
    return sortPostsForTab(list, tab)
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
    const draft = consumeRound5CertWriteIntent()
    if (!draft) return
    setTab('round5_cert')
    setWriteBoard('round5_cert')
    setWritePrefill(draft)
    setView('write')
    setSelectedId(null)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [tab, appliedQuery, pageSize, visiblePosts.length])

  useEffect(() => {
    if (!user) {
      setIsCommunityAdmin(false)
      return undefined
    }
    let cancelled = false
    resolveCommunityAdmin(user).then(admin => {
      if (!cancelled) setIsCommunityAdmin(admin)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.email])

  const bumpMeta = () => setMetaTick(t => t + 1)

  const runSearch = () => {
    setAppliedQuery(searchInput)
    setPage(1)
  }

  const openWrite = () => {
    if (tab === 'round5_cert') {
      if (!canWriteRound5Cert) {
        window.alert('시험 탭에서 기출 5회독을 완료한 뒤에 인증글을 작성할 수 있습니다.')
        return
      }
      setWriteBoard('round5_cert')
      setWritePrefill(
        round5CertYears[0] ? buildRound5CertDraft(round5CertYears[0]) : null,
      )
    } else {
      setWriteBoard(boardFromTab(tab))
      setWritePrefill(null)
    }
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
    setWritePrefill(null)
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

  const canEditPost = post => {
    if (post.authorId && user) return post.authorId === user.id
    return post.nickname === myNickname
  }

  const canDeletePost = post => canEditPost(post)

  const openEdit = () => {
    if (!selectedPost || !canEditPost(selectedPost)) return
    setView('edit')
  }

  const handleUpdated = async draft => {
    const saved = await onUpdatePost?.(draft)
    if (saved) {
      setSelectedId(saved.id)
      setView('detail')
      bumpMeta()
      return
    }
    window.alert('글 수정에 실패했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.')
  }

  if (view === 'write') {
    return (
      <div className="min-h-screen bg-slate-50 pb-bottom-nav flex flex-col">
        <WriteForm
          key={`${writeBoard}-${writePrefill?.certYear ?? 'new'}`}
          authorLabel={myNickname}
          defaultBoard={writeBoard}
          writePrefill={writePrefill}
          round5CertYears={round5CertYears}
          onSubmit={handlePosted}
          onCancel={backToList}
          canPostNotice={isCommunityAdmin}
        />
      </div>
    )
  }

  if (view === 'edit' && selectedPost) {
    return (
      <div className="min-h-screen bg-slate-50 pb-bottom-nav flex flex-col">
        <WriteForm
          key={`edit-${selectedPost.id}`}
          authorLabel={myNickname}
          editPost={selectedPost}
          round5CertYears={round5CertYears}
          onSubmit={handleUpdated}
          onCancel={() => setView('detail')}
          canPostNotice={isCommunityAdmin}
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
          myNickname={myNickname}
          onBack={backToList}
          onEdit={openEdit}
          onDelete={handleDelete}
          onLike={bumpMeta}
          onSyncPostMeta={onSyncPostMeta}
          canEdit={canEditPost(selectedPost)}
          canDelete={canDeletePost(selectedPost)}
          onLoadComments={onLoadComments}
          onAddComment={onAddComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      </div>
    )
  }

  const activeTab = TABS.find(t => t.id === tab)
  const tabBoardHint =
    tab === 'qa'
      ? getBoardConfig(boardFromTab(tab)).description
        : tab === 'round5_cert'
          ? canWriteRound5Cert
            ? getBoardConfig('round5_cert').description
            : '5회독 완료 후 인증글 작성 가능'
      : tab === 'error_report'
        ? '지문·정답·해설 오류 신고'
        : tab === 'recommended'
          ? `추천 ${RECOMMENDED_LIKE_MIN}개 이상 받은 글`
          : null

  return (
    <div className="min-h-screen bg-slate-50 pb-bottom-nav">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <BomGichulWordmark suffix="커뮤니티" />
            <p className="text-sm text-slate-500 mt-1">
              {activeTab?.label ?? '전체'} {visiblePosts.length}개
              {tabBoardHint ? ` · ${tabBoardHint}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExamDdayChip />
            <LimeButton
              onClick={openWrite}
              disabled={tab === 'round5_cert' && !canWriteRound5Cert}
              className={`h-9 px-5 text-sm inline-flex items-center justify-center ${
                tab === 'round5_cert' && !canWriteRound5Cert ? 'opacity-45 cursor-not-allowed' : ''
              }`}
            >
              글쓰기
            </LimeButton>
          </div>
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
                        <p className="text-xs mt-2">
                          {tab === 'recommended' &&
                            `추천 ${RECOMMENDED_LIKE_MIN}개 이상 받은 글이 여기에 표시됩니다.`}
                          {tab === 'round5_cert' &&
                            (canWriteRound5Cert
                              ? '5회독을 완료했다면 인증글을 남겨 보세요.'
                              : '시험 탭에서 5회독을 완료하면 인증글을 작성할 수 있습니다.')}
                          {tab === 'qa' && 'Q&A 탭에서 질문을 남겨 보세요.'}
                          {tab === 'error_report' && '문제·해설 오류를 신고해 주세요.'}
                          {(tab === 'all' || tab === 'notice') &&
                            '오른쪽 위 「글쓰기」로 첫 글을 남겨 보세요.'}
                        </p>
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
                            {tab === 'all' && !post.isNotice && isRecommendedPost(post) && (
                              <RecommendedBadge />
                            )}
                            {tab === 'all' && !post.isNotice && (
                              <BoardBadge boardId={getPostBoard(post)} />
                            )}
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
