import React from 'react'

const AMOUNT_RE = /\bK\s*([\d,]+(?:\.\d+)?)/g
const BOLD_RE   = /\*\*(.+?)\*\*/g
const ITALIC_RE = /\*(.+?)\*/g
const CODE_RE   = /`(.+?)`/g

function formatInline(text) {
  return text
    .replace(AMOUNT_RE, '<span class="zmw">K$1</span>')
    .replace(BOLD_RE,   '<strong>$1</strong>')
    .replace(ITALIC_RE, '<em>$1</em>')
    .replace(CODE_RE,   '<code>$1</code>')
}

export default function KipMarkdown({ content, className = '' }) {
  if (!content) return null

  const lines   = content.split('\n')
  const elements = []
  let listItems = []
  let keyIdx = 0
  const k = () => `kmd-${keyIdx++}`

  function flushList() {
    if (!listItems.length) return
    elements.push(
      <ul key={k()} className="kip-md">
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
        ))}
      </ul>
    )
    listItems = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trim = line.trim()

    if (!trim) {
      flushList()
      elements.push(<div key={k()} className="h-2" />)
      continue
    }

    // HR
    if (/^---+$/.test(trim)) {
      flushList()
      elements.push(<hr key={k()} className="kip-md" />)
      continue
    }

    // Emoji section header (e.g. "📊 PERFORMANCE SUMMARY")
    const emojiSection = trim.match(/^([\u{1F300}-\u{1FFFF}]|[\u{2600}-\u{27FF}])\s+(.+)/u)
    if (emojiSection) {
      flushList()
      elements.push(
        <div key={k()} className="kip-md kip-section">
          <span style={{ fontSize: '16px' }}>{emojiSection[1]}</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(emojiSection[2]) }} />
        </div>
      )
      continue
    }

    // H2
    const h2 = trim.match(/^#{1,2}\s+(.+)/)
    if (h2) {
      flushList()
      elements.push(<h2 key={k()} className="kip-md" dangerouslySetInnerHTML={{ __html: formatInline(h2[1]) }} />)
      continue
    }

    // H3
    const h3 = trim.match(/^###\s+(.+)/)
    if (h3) {
      flushList()
      elements.push(<h3 key={k()} className="kip-md" dangerouslySetInnerHTML={{ __html: formatInline(h3[1]) }} />)
      continue
    }

    // Bullet
    const bullet = trim.match(/^[-*•]\s+(.+)/)
    if (bullet) {
      listItems.push(bullet[1])
      continue
    }

    // Numbered
    const numbered = trim.match(/^\d+\.\s+(.+)/)
    if (numbered) {
      listItems.push(numbered[1])
      continue
    }

    // Paragraph
    flushList()
    elements.push(
      <p key={k()} className="kip-md"
         dangerouslySetInnerHTML={{ __html: formatInline(trim) }} />
    )
  }

  flushList()

  return <div className={className}>{elements}</div>
}
