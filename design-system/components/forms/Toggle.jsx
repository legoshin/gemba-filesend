import React from 'react';

/** Gemba Toggle — 36×20 track, 16px knob. Ink track when on. */
export function Toggle({ checked = false, disabled = false, label, onChange, id, style }) {
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
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          padding: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          background: checked ? 'var(--gemba-ink-800)' : 'var(--gemba-ink-400)',
          transition: 'background .15s ease',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(40,51,73,0.25)',
          }}
        />
      </span>
      {label && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: '20px', color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}

export default Toggle;
