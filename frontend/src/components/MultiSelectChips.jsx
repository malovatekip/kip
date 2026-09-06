import React from 'react'

/**
 * Reusable chip/tag multi-select. Used by the New Idea wizard for the
 * Skills (Slide 3) and Assets (Slide 4) questions -- no equivalent existed
 * anywhere in the app before k-big-2.
 *
 * options: array of strings, or { value, label } objects.
 * selected: array of selected values.
 * onChange: (nextSelectedArray) => void
 */
export default function MultiSelectChips({ options, selected, onChange, groupLabel }) {
  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value))
    else onChange([...selected, value])
  }

  return (
    <div style={{ marginBottom: groupLabel ? 18 : 0 }}>
      {groupLabel && (
        <div style={{
          fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          {groupLabel}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const value = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 12.5,
                fontFamily: 'Syne', fontWeight: 600, cursor: 'pointer',
                transition: 'background .15s, border-color .15s, color .15s',
                color: active ? '#fff' : 'var(--muted)',
                background: active ? 'var(--blue)' : 'var(--surface-2)',
                border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
