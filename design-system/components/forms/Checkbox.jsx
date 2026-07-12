import React from 'react';

/**
 * Gemba Checkbox — 24×24 hit area, 18×18 box, 6px radius.
 * Unselected: 0.8px #9499A4 ring. Selected: filled ink (#283349) with white check.
 */
export function Checkbox({ checked = false, indeterminate = false, disabled = false, label, onChange, id, style }) {
  const on = checked || indeterminate;
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <span
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: on ? 'var(--gemba-ink-800)' : 'var(--surface-card)',
          boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--gemba-ink-400)',
          transition: 'background .12s ease',
          flexShrink: 0,
        }}
      >
        {checked && !indeterminate && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {indeterminate && (
          <span style={{ width: 8, height: 1.6, borderRadius: 1, background: '#fff' }} />
        )}
      </span>
      {label && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: '20px', color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}

export default Checkbox;
