import { useMemo } from 'react'
import { splitByTermHighlight } from '../utils/highlightText'

export default function HighlightText({ text, term, className = '' }) {
  const parts = useMemo(() => splitByTermHighlight(text, term), [text, term])
  if (!term?.trim()) {
    return <span className={className}>{text}</span>
  }
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className="bg-red-100 text-red-700 font-semibold rounded px-0.5 not-italic"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  )
}
