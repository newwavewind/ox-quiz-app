/** @typedef {'general' | 'qa' | 'error_question' | 'error_explanation'} CommunityBoardId */

export const DEFAULT_BOARD = 'general'

/** 추천글 탭에 자동 노출되는 최소 추천 수 */
export const RECOMMENDED_LIKE_MIN = 5

/** @type {{ id: CommunityBoardId, label: string, shortLabel?: string, description: string, titlePlaceholder: string, contentHint: string, listBadgeClass?: string }[]} */
export const COMMUNITY_BOARDS = [
  {
    id: 'general',
    label: '자유글',
    description: '수험생 자유 게시글',
    titlePlaceholder: '제목을 입력하세요',
    contentHint: '내용을 자유롭게 작성하세요.',
  },
  {
    id: 'qa',
    label: 'Q&A',
    shortLabel: 'Q&A',
    description: '문제·개념 질문',
    titlePlaceholder: '예: 집합건물 대표권 범위가 헷갈려요',
    contentHint: '회차·문항 번호와 함께 궁금한 점을 적어 주세요.',
    listBadgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  {
    id: 'error_question',
    label: '문제오류',
    shortLabel: '문제',
    description: '지문·정답·보기 오류 신고',
    titlePlaceholder: '예: 제30회 79번 — 지문 오타',
    contentHint: '회차·문항 번호, 어떤 부분이 틀렸는지, 올바른 내용(알고 있다면)을 적어 주세요.',
    listBadgeClass: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  {
    id: 'error_explanation',
    label: '해설오류',
    shortLabel: '해설',
    description: '해설 내용 오류 신고',
    titlePlaceholder: '예: 제30회 79번 — 해설 설명이 틀린 것 같아요',
    contentHint: '회차·문항 번호, 해설의 어느 부분이 문제인지 구체적으로 적어 주세요.',
    listBadgeClass: 'text-violet-700 bg-violet-50 border-violet-200',
  },
]

const boardById = new Map(COMMUNITY_BOARDS.map(b => [b.id, b]))

export function normalizeBoard(board) {
  return boardById.has(board) ? board : DEFAULT_BOARD
}

export function getBoardConfig(boardId) {
  return boardById.get(normalizeBoard(boardId)) ?? boardById.get(DEFAULT_BOARD)
}

/** @param {import('./communityPosts').CommunityPost} post */
export function getPostBoard(post) {
  if (post?.board) return normalizeBoard(post.board)
  return DEFAULT_BOARD
}

/** @param {import('./communityPosts').CommunityPost} post */
export function isRecommendedPost(post) {
  if (post?.isNotice) return false
  return (post?.likeCount ?? 0) >= RECOMMENDED_LIKE_MIN
}

export function isWritableBoard(boardId) {
  return boardById.has(boardId)
}

export const ERROR_BOARD_IDS = ['error_question', 'error_explanation']

export function isErrorBoard(boardId) {
  return ERROR_BOARD_IDS.includes(normalizeBoard(boardId))
}

export function boardFromTab(tab) {
  if (tab === 'qa') return 'qa'
  if (tab === 'error_report') return 'error_question'
  return DEFAULT_BOARD
}
