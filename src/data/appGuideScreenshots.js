/** 공지 설명서용 스크린샷 (public/guide/*.png) */
export const GUIDE_SCREENSHOTS = {
  home: {
    src: '/guide/01-home.png',
    alt: '학습 탭 — 연도별·목차별 학습 화면',
    caption: '▲ ① 학습 탭 — 여기서 연도·목차를 고릅니다',
  },
  exam: {
    src: '/guide/02-exam.png',
    alt: '시험 탭 — 기출 40문항·랜덤',
    caption: '▲ ② 시험 탭 — 회차별·랜덤 시험 모드',
  },
  studyAi: {
    src: '/guide/03-study-ai.png',
    alt: '문제 풀이 화면 — O/X·정답 확인·GPT Gemini Claude 버튼',
    caption: '▲ ③ 문제 화면 — 【GPT·Gemini·Claude】 AI 버튼 위치',
  },
  glossary: {
    src: '/guide/04-glossary.png',
    alt: '용어집 — 검색·초성·용어 목록',
    caption: '▲ ④ 용어집 — 검색·초성 바·관련 기출',
  },
  glossaryAi: {
    src: '/guide/05-glossary-ai.png',
    alt: '용어집 — AI 용어 설명 버튼',
    caption: '▲ ⑤ 용어집 — 【AI 용어 설명】 버튼',
  },
  notes: {
    src: '/guide/06-notes.png',
    alt: '암기노트 목록',
    caption: '▲ ⑥ 암기노트 — 저장한 문항 복습',
  },
  community: {
    src: '/guide/07-community.png',
    alt: '커뮤니티 — 공지·글 목록',
    caption: '▲ ⑦ 커뮤니티 — 공지·글 (지금 읽는 화면)',
  },
  bottomNav: {
    src: '/guide/08-bottom-nav.png',
    alt: '하단 메뉴 — 학습·시험·암기노트·용어집·커뮤니티',
    caption: '▲ 맨 아래 다섯 메뉴 — 언제든 탭 이동',
  },
}

export function guideShot(key) {
  const shot = GUIDE_SCREENSHOTS[key]
  if (!shot) return ''
  const alt = shot.alt.replace(/"/g, '&quot;')
  return `<p><strong>${shot.caption}</strong></p><img src="${shot.src}" alt="${alt}" loading="lazy"><br>`
}
