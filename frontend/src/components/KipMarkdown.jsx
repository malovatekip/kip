/**
 * KipMarkdown — Rich visual renderer for KIP AI responses
 *
 * Handles:
 *  - ## Section headers  → coloured accent bars + Syne font
 *  - **bold**            → white, weighted
 *  - *italic*            → muted colour
 *  - `code`              → pill with blue background
 *  - K1,234 / ZMW       → gold highlighted amounts
 *  - - bullet lists      → custom arrow bullets
 *  - 1. numbered lists   → teal numbered circles
 *  - | tables |          → styled data tables
 *  - ---                 → gradient divider
 *  - > blockquotes       → left-bar callout
 *  - ⚠ ✓ ✗ 📊 🚀 etc   → emoji preserved inline
 *  - *Ready to build?*   → CTA line styled distinctly
 */

import React from 'react'

/* ── Colour map for section headers ─────────────────────────────────────── */
const SECTION_COLORS = {
  '📊': 'var(--blue-bright)',
  '💰': 'var(--gold)',
  '📈': 'var(--green)',
  '🚀': 'var(--teal)',
  '📋': 'var(--muted)',
  '🏢': 'var(--blue-bright)',
  '🔍': 'var(--violet)',
  '⚠':  'var(--gold)',
  '✅': 'var(--green)',
  '❌': 'var(--red)',
  '💡': 'var(--gold-bright)',
  '🎯': 'var(--teal)',
  '📌': 'var(--blue-bright)',
  '🔧': 'var(--muted)',
  '⭐': 'var(--gold)',
}

function headerColor(text) {
  for (const [emoji, color] of Object.entries(SECTION_COLORS)) {
    if (text.includes(emoji)) return color
  }
  return 'var(--blue-bright)'
}

/* ── Inline text parser ──────────────────────────────────────────────────── */
function parseInline(text) {
  if (!text) return null

  // Split on markdown patterns
  const parts = []
  let rest = text
  let key  = 0

  // Patterns: **bold**, *italic*, `code`, K amounts
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|K[\d,]+(?:\.\d+)?(?:\/month|\/day|\/year|\/week)?)/g

  let lastIdx = 0
  let match

  pattern.lastIndex = 0
  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIdx) {
      parts.push(
        <span key={key++}>{highlightAmounts(text.slice(lastIdx, match.index))}</span>
      )
    }

    const m = match[0]

    if (m.startsWith('**')) {
      parts.push(
        <strong key={key++} style={{ color: 'var(--text)', fontWeight: 700 }}>
          {m.slice(2, -2)}
        </strong>
      )
    } else if (m.startsWith('*')) {
      parts.push(
        <em key={key++} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
          {m.slice(1, -1)}
        </em>
      )
    } else if (m.startsWith('`')) {
      parts.push(
        <code key={key++} style={{
          background: 'var(--blue-dim)', color: 'var(--blue-bright)',
          padding: '2px 8px', borderRadius: 6, fontSize: '0.88em',
          fontFamily: 'monospace', fontWeight: 600,
        }}>
          {m.slice(1, -1)}
        </code>
      )
    } else if (m.startsWith('K')) {
      // ZMW amount
      parts.push(
        <span key={key++} style={{
          color: 'var(--gold-bright)', fontWeight: 800,
          fontFamily: 'Syne', fontSize: '1em',
        }}>
          {m}
        </span>
      )
    }

    lastIdx = match.index + m.length
  }

  if (lastIdx < text.length) {
    parts.push(<span key={key++}>{highlightAmounts(text.slice(lastIdx))}</span>)
  }

  return parts.length > 0 ? parts : text
}

/* Highlight K amounts not caught by the main pattern (e.g. after : or space) */
function highlightAmounts(text) {
  if (!text || !text.includes('K')) return text
  const parts = text.split(/(K[\d,]+(?:\.\d+)?(?:\/month|\/day|\/year|\/week)?)/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    /^K[\d,]/.test(part) ? (
      <span key={i} style={{ color: 'var(--gold-bright)', fontWeight: 800, fontFamily: 'Syne' }}>
        {part}
      </span>
    ) : part
  )
}

/* ── Table parser ────────────────────────────────────────────────────────── */
function parseTable(lines) {
  const rows = lines
    .filter(l => l.trim().startsWith('|'))
    .map(l => l.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim()))

  if (rows.length < 2) return null

  const headers = rows[0]
  const body    = rows.slice(2) // skip separator row

  return (
    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '8px 12px', textAlign: 'left',
                background: 'linear-gradient(135deg, var(--blue), var(--blue-mid))',
                color: '#fff', fontFamily: 'Syne', fontWeight: 700, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '2px solid var(--teal)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 12px',
                  background: ri % 2 === 0 ? 'var(--input-bg)' : 'var(--card)',
                  color: 'var(--text)', fontSize: 13,
                  borderBottom: '1px solid var(--border)',
                }}>
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Main renderer ───────────────────────────────────────────────────────── */
export default function KipMarkdown({ content }) {
  if (!content) return null

  const lines  = content.split('\n')
  const output = []
  let   i      = 0

  while (i < lines.length) {
    const raw  = lines[i]
    const line = raw.trimEnd()

    // ── H1 (# text) ────────────────────────────────────────────────────────
    if (/^#{1}\s/.test(line) && !/^#{2,}/.test(line)) {
      const text  = line.replace(/^#+\s*/, '').trim()
      const color = headerColor(text)
      output.push(
        <div key={i} style={{ marginBottom: 18, marginTop: 8 }}>
          <h1 style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 20,
            color: 'var(--text)', lineHeight: 1.25, margin: 0,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {text}
          </h1>
          <div style={{ height: 3, borderRadius: 3, marginTop: 6, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        </div>
      )
      i++; continue
    }

    // ── H2 (## text) ───────────────────────────────────────────────────────
    if (/^#{2}\s/.test(line) && !/^#{3,}/.test(line)) {
      const text  = line.replace(/^#+\s*/, '').trim()
      const color = headerColor(text)
      output.push(
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          margin: '18px 0 8px', padding: '8px 12px',
          background: `${color}0D`,
          borderLeft: `3px solid ${color}`,
          borderRadius: '0 8px 8px 0',
        }}>
          <span style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 13,
            color, textTransform: 'uppercase', letterSpacing: '0.06em',
            lineHeight: 1.3,
          }}>
            {text}
          </span>
        </div>
      )
      i++; continue
    }

    // ── H3 (### text) ──────────────────────────────────────────────────────
    if (/^#{3}\s/.test(line)) {
      const text  = line.replace(/^#+\s*/, '').trim()
      const color = headerColor(text)
      output.push(
        <h3 key={i} style={{
          fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
          color, margin: '14px 0 6px', lineHeight: 1.4,
        }}>
          {parseInline(text)}
        </h3>
      )
      i++; continue
    }

    // ── HR (---) ────────────────────────────────────────────────────────────
    if (/^---+$/.test(line.trim())) {
      output.push(
        <div key={i} style={{
          height: 1, margin: '14px 0',
          background: 'linear-gradient(90deg, transparent, var(--blue), var(--teal), transparent)',
        }} />
      )
      i++; continue
    }

    // ── Blockquote (> text) ─────────────────────────────────────────────────
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '')
      output.push(
        <div key={i} style={{
          background: 'var(--blue-dim)', borderLeft: '3px solid var(--blue)',
          borderRadius: '0 10px 10px 0', padding: '10px 14px', margin: '10px 0',
          fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.65,
        }}>
          {parseInline(text)}
        </div>
      )
      i++; continue
    }

    // ── Table (lines starting with |) ───────────────────────────────────────
    if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]); i++
      }
      const table = parseTable(tableLines)
      if (table) output.push(<div key={`table-${i}`}>{table}</div>)
      continue
    }

    // ── Bullet list (- or * item) ───────────────────────────────────────────
    if (/^[\s]*[-*]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[\s]*[-*]\s/.test(lines[i])) {
        const text   = lines[i].replace(/^[\s]*[-*]\s*/, '').trim()
        const indent = lines[i].search(/\S/)
        items.push({ text, indent })
        i++
      }
      output.push(
        <ul key={`ul-${i}`} style={{ listStyle: 'none', padding: 0, margin: '8px 0 12px' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 7, paddingLeft: item.indent > 0 ? 20 : 0,
            }}>
              <span style={{
                color: item.indent > 0 ? 'var(--teal)' : 'var(--blue-bright)',
                fontSize: item.indent > 0 ? 9 : 11, marginTop: 4, flexShrink: 0,
                fontWeight: 700,
              }}>
                {item.indent > 0 ? '◦' : '▸'}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>
                {parseInline(item.text)}
              </span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // ── Numbered list (1. item) ─────────────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const num  = parseInt(lines[i].match(/^(\d+)/)[1])
        const text = lines[i].replace(/^\d+\.\s*/, '').trim()
        items.push({ num, text }); i++
      }
      output.push(
        <ol key={`ol-${i}`} style={{ listStyle: 'none', padding: 0, margin: '8px 0 12px' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, fontFamily: 'Syne', color: '#fff',
                marginTop: 1,
              }}>
                {item.num}
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65, flex: 1 }}>
                {parseInline(item.text)}
              </span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // ── CTA line (*Ready to build?* / *italic paragraph*) ──────────────────
    if (line.trim().startsWith('*') && line.trim().endsWith('*') && !line.trim().startsWith('**')) {
      const text = line.trim().slice(1, -1)
      output.push(
        <div key={i} style={{
          margin: '16px 0 4px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, var(--blue-dim), var(--teal-dim))',
          border: '1px solid rgba(43,127,255,0.2)',
          borderRadius: 12,
          fontSize: 13, color: 'var(--blue-bright)',
          fontStyle: 'italic', lineHeight: 1.6,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          {parseInline(text)}
        </div>
      )
      i++; continue
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (line.trim() === '') {
      // Only add spacer if previous output wasn't already a block element
      if (output.length > 0) {
        output.push(<div key={i} style={{ height: 6 }} />)
      }
      i++; continue
    }

    // ── Regular paragraph ────────────────────────────────────────────────────
    output.push(
      <p key={i} style={{
        fontSize: 13.5, color: 'var(--text)', lineHeight: 1.75,
        margin: '0 0 8px', wordBreak: 'break-word',
      }}>
        {parseInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className="kip-md" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
      {output}
    </div>
  )
}
