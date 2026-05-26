import { useRef, useState } from 'react'
import {
  createEmptyPoll,
  EMPTY_EXTRAS,
  getPollTotals,
  getVoterKey,
  hasExtrasContent,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_VIDEO_BYTES,
  MAX_VIDEOS,
  normalizeExtras,
  readFileAsDataUrl,
} from '../data/communityExtras'
import { votePoll } from '../data/communityPostMeta'
import {
  applyEditorColor,
  applyEditorFont,
  applyEditorFontSize,
  execEditorCommand,
  FONT_OPTIONS,
  SIZE_OPTIONS,
} from '../utils/communityRichText'

function ToolbarChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
        active
          ? 'bg-lime-400 border-lime-400 text-slate-900'
          : 'border-lime-300 text-slate-600 hover:bg-lime-50'
      }`}
    >
      {children}
    </button>
  )
}

function FormatToolBtn({ active, title, children, onClick, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg border text-xs font-semibold transition-colors ${
        active
          ? 'bg-lime-100 border-lime-400 text-slate-900'
          : 'bg-white border-slate-200 text-slate-700 hover:border-lime-400'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function CustomColorSwatch({ onPick }) {
  const [color, setColor] = useState('#0f172a')

  return (
    <label
      className="relative w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform cursor-pointer shrink-0 overflow-hidden"
      title="글자색 · 직접 선택"
    >
      <span className="sr-only">직접 색 선택</span>
      <input
        type="color"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        value={color}
        onChange={e => {
          setColor(e.target.value)
          onPick(e.target.value)
        }}
      />
      <span
        className="block w-full h-full rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    </label>
  )
}

/** @param {{ editorRef: import('react').RefObject<HTMLElement|null>, onSync: () => void }} props */
export function WriteFormatToolbar({ editorRef, onSync }) {
  const run = fn => {
    const el = editorRef?.current
    if (!el) return
    fn(el)
    onSync?.()
  }

  return (
    <div className="px-3 py-2.5 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
        <span className="sr-only">글꼴</span>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue=""
          onChange={e => {
            const id = e.target.value
            if (id) run(el => applyEditorFont(el, id))
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            글꼴
          </option>
          {FONT_OPTIONS.map(f => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
        <span className="sr-only">크기</span>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
          defaultValue=""
          onChange={e => {
            const opt = SIZE_OPTIONS.find(s => s.id === e.target.value)
            if (opt) run(el => applyEditorFontSize(el, opt.value))
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            크기
          </option>
          {SIZE_OPTIONS.map(s => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <CustomColorSwatch onPick={color => run(el => applyEditorColor(el, color))} />
      <span className="w-px h-6 bg-slate-200 shrink-0" aria-hidden />
      <FormatToolBtn title="굵게" onClick={() => run(el => execEditorCommand(el, 'bold'))}>
        <span className="font-bold">가</span>
      </FormatToolBtn>
      <FormatToolBtn title="기울임" onClick={() => run(el => execEditorCommand(el, 'italic'))}>
        <span className="italic">가</span>
      </FormatToolBtn>
      <FormatToolBtn title="취소선" onClick={() => run(el => execEditorCommand(el, 'strikeThrough'))}>
        <span className="line-through">가</span>
      </FormatToolBtn>
    </div>
  )
}

/** @param {{ extras: object, onChange: (e: object) => void, editorRef?: import('react').RefObject<HTMLElement|null>, onEditorSync?: () => void }} props */
export function WriteExtrasEditor({ extras, onChange, editorRef, onEditorSync }) {
  const normalized = normalizeExtras(extras)
  const [panel, setPanel] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const mediaInputRef = useRef(null)

  const setExtras = next => onChange(normalizeExtras(next))

  const handleFiles = async files => {
    setMediaError('')
    const list = [...files]
    let media = [...normalized.media]

    for (const file of list) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) continue

      if (isImage) {
        if (media.filter(m => m.type === 'image').length >= MAX_IMAGES) {
          setMediaError(`사진은 최대 ${MAX_IMAGES}장까지입니다.`)
          break
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setMediaError('사진은 1.5MB 이하만 첨부할 수 있습니다.')
          continue
        }
        const dataUrl = await readFileAsDataUrl(file)
        media.push({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          dataUrl,
          name: file.name,
        })
      } else {
        if (media.filter(m => m.type === 'video').length >= MAX_VIDEOS) {
          setMediaError(`동영상은 ${MAX_VIDEOS}개까지입니다.`)
          break
        }
        if (file.size > MAX_VIDEO_BYTES) {
          setMediaError('동영상은 8MB 이하만 첨부할 수 있습니다.')
          continue
        }
        const dataUrl = await readFileAsDataUrl(file)
        media.push({
          id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'video',
          dataUrl,
          name: file.name,
        })
      }
    }
    setExtras({ ...normalized, media })
  }

  const removeMedia = id => {
    setExtras({
      ...normalized,
      media: normalized.media.filter(m => m.id !== id),
    })
  }

  const ensurePoll = () => normalized.poll ?? createEmptyPoll()

  const updatePoll = patch => {
    setExtras({ ...normalized, poll: { ...ensurePoll(), ...patch } })
  }

  const addPollOption = () => {
    const poll = ensurePoll()
    if (poll.options.length >= 5) return
    updatePoll({ options: [...poll.options, ''] })
  }

  const removePollOption = idx => {
    const poll = ensurePoll()
    if (poll.options.length <= 2) return
    updatePoll({ options: poll.options.filter((_, i) => i !== idx) })
  }

  const showMediaPreview = normalized.media.length > 0 || mediaError

  return (
    <div className="border-b border-slate-100 bg-slate-50">
      <div className="flex flex-wrap gap-2 px-3 py-2">
        <ToolbarChip
          active={normalized.media.length > 0}
          onClick={() => mediaInputRef.current?.click()}
        >
          사진·동영상
          {normalized.media.length > 0 && ` (${normalized.media.length})`}
        </ToolbarChip>
        <ToolbarChip
          active={panel === 'poll'}
          onClick={() => {
            if (!normalized.poll) updatePoll(createEmptyPoll())
            setPanel(panel === 'poll' ? null : 'poll')
          }}
        >
          투표{normalized.poll?.question ? ' ✓' : ''}
        </ToolbarChip>
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {editorRef && onEditorSync && (
        <>
          <div className="border-t border-slate-200" role="separator" />
          <WriteFormatToolbar editorRef={editorRef} onSync={onEditorSync} />
        </>
      )}

      {showMediaPreview && (
        <div className="px-3 pb-3 space-y-2">
          {mediaError && <p className="text-xs text-red-600">{mediaError}</p>}
          {normalized.media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {normalized.media.map(item => (
                <div key={item.id} className="relative group">
                  {item.type === 'image' ? (
                    <img
                      src={item.dataUrl}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-28 h-20 rounded-lg border border-slate-200 bg-slate-900 flex items-center justify-center text-white text-xs">
                      동영상
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel === 'poll' && (
        <div className="px-3 pb-3 space-y-2">
          <input
            type="text"
            value={ensurePoll().question}
            onChange={e => updatePoll({ question: e.target.value })}
            placeholder="투표 질문"
            maxLength={120}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {ensurePoll().options.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={e => {
                  const options = [...ensurePoll().options]
                  options[idx] = e.target.value
                  updatePoll({ options })
                }}
                placeholder={`항목 ${idx + 1}`}
                maxLength={60}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              {ensurePoll().options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePollOption(idx)}
                  className="text-slate-400 hover:text-red-500 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {ensurePoll().options.length < 5 && (
            <button
              type="button"
              onClick={addPollOption}
              className="text-xs font-semibold text-lime-800 hover:underline"
            >
              + 항목 추가
            </button>
          )}
        </div>
      )}

    </div>
  )
}

/** @param {{ post: object, user: object|null, onMetaChange: () => void }} props */
export function PostExtrasContent({ post, user, onMetaChange }) {
  const extras = normalizeExtras(post.extras)
  const voterKey = getVoterKey(user)
  const myVote = extras.poll?.votedBy?.[voterKey]
  const pollTotal = getPollTotals(extras.poll)

  const handleVote = idx => {
    const result = votePoll(post.id, idx, voterKey)
    if (result.ok) onMetaChange()
  }

  if (!hasExtrasContent(extras) && !extras.youtube?.videoId) return null

  return (
    <div className="mt-6 space-y-5">
      {extras.youtube?.videoId && (
        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-black">
          <iframe
            title="YouTube"
            src={`https://www.youtube.com/embed/${extras.youtube.videoId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {extras.media.length > 0 && (
        <div className="space-y-3">
          {extras.media.map(item =>
            item.type === 'image' ? (
              <img
                key={item.id}
                src={item.dataUrl}
                alt={item.name || ''}
                className="max-w-full rounded-xl border border-slate-200"
              />
            ) : (
              <video
                key={item.id}
                src={item.dataUrl}
                controls
                className="max-w-full rounded-xl border border-slate-200 bg-black"
              />
            ),
          )}
        </div>
      )}

      {extras.poll?.question?.trim() && (
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <p className="text-sm font-bold text-slate-800 mb-3">📊 {extras.poll.question}</p>
          <div className="space-y-2">
            {extras.poll.options.map((opt, idx) => {
              if (!opt.trim()) return null
              const count = extras.poll.votes?.[String(idx)] || 0
              const pct = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0
              const voted = myVote === idx
              return (
                <div key={idx}>
                  <button
                    type="button"
                    disabled={myVote !== undefined}
                    onClick={() => handleVote(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      voted
                        ? 'border-lime-500 bg-lime-50 font-semibold'
                        : myVote !== undefined
                          ? 'border-slate-200 bg-white opacity-80'
                          : 'border-slate-200 bg-white hover:border-lime-400 hover:bg-lime-50/50'
                    }`}
                  >
                    <span className="text-slate-800">{opt}</span>
                    {pollTotal > 0 && (
                      <span className="float-right text-slate-500 tabular-nums">
                        {count}표 ({pct}%)
                      </span>
                    )}
                  </button>
                  {pollTotal > 0 && (
                    <div className="h-1.5 mt-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-lime-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {myVote !== undefined
              ? '이미 투표하셨습니다.'
              : '항목을 눌러 투표하세요.'}{' '}
            · 총 {pollTotal}표
          </p>
        </div>
      )}
    </div>
  )
}

export function PostTitleBadges({ extras }) {
  const e = normalizeExtras(extras)
  return (
    <>
      {e.youtube?.videoId && (
        <span className="inline-block text-red-600 mr-1" title="YouTube">
          ▶
        </span>
      )}
      {e.media?.some(m => m.type === 'image') && (
        <span className="inline-block text-slate-500 mr-1" title="사진">
          🖼
        </span>
      )}
      {e.media?.some(m => m.type === 'video') && (
        <span className="inline-block text-slate-500 mr-1" title="동영상">
          🎬
        </span>
      )}
      {e.poll?.question && (
        <span className="inline-block text-slate-500 mr-1" title="투표">
          📊
        </span>
      )}
    </>
  )
}

export { EMPTY_EXTRAS, hasExtrasContent, normalizeExtras }
