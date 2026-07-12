import React from 'react';

/** Gemba Radio — 18×18 circle, ink ring + ink dot when selected. */
export function Radio({ checked = false, disabled = false, label, name, value, onChange, id, style }) {
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
        role="radio"
        aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(value)}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-card)',
          boxShadow: checked ? 'inset 0 0 0 1.5px var(--gemba-ink-800)' : 'inset 0 0 0 1.5px var(--gemba-ink-400)',
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gemba-ink-800)' }} />}
      </span>
      {label && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: '20px', color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}

export default Radio;
