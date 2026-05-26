let activeHandler = null

/** 화면별 스크롤 핸들러 등록 (언마운트 시 cleanup 반환) */
export function registerScrollToTop(handler) {
  activeHandler = handler
  return () => {
    if (activeHandler === handler) activeHandler = null
  }
}

/** AuthBar 등 공통 UI에서 호출 */
export function requestScrollToTop() {
  if (activeHandler) {
    activeHandler()
    return
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
