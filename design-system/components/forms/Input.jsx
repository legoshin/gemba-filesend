import React from 'react';

/**
 * Gemba Input — labelled text field.
 * Transcribed from the Figma Design-System "Input fields" frame:
 * 40px tall, 8px radius, white surface, 1px inset hairline + soft shadow;
 * focus swaps to a 2px ink ring. Label 14/bold, hint 12/subdued.
 */
export function Input({
  label,
  hint,
  placeholder,
  value,
  defaultValue,
  onChange,
  type = 'text',
  state = 'default',      // 'default' | 'error' | 'success' | 'disabled'
  prefix,                 // leading node (icon)
  suffix,                 // trailing node (icon / text)
  id,
  className,
  style,
  ...rest
}) {
  const disabled = state === 'disabled';
  const ring =
    state === 'error'
      ? 'inset 0 0 0 1px var(--gemba-critical)'
      : state === 'success'
      ? 'inset 0 0 0 1px var(--gemba-success)'
      : 'inset 0 0 0 1px var(--border-default)';

  const hintColor =
    state === 'error'
      ? 'var(--gemba-critical)'
      : state === 'success'
      ? 'var(--gemba-success)'
      : 'var(--text-subdued)';

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', ...style }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 14,
            lineHeight: '20px',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
          alignSelf: 'stretch',
          height: 40,
          padding: '10px 16px',
          borderRadius: 8,
          background: disabled ? 'var(--surface-subdued)' : 'var(--surface-card)',
          boxShadow: `${ring}, var(--shadow-field)`,
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {prefix && (
          <span style={{ display: 'flex', color: 'var(--icon-subtle)', flexShrink: 0 }}>{prefix}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            fontSize: 14,
            lineHeight: '20px',
            color: 'var(--text-primary)',
          }}
          {...rest}
        />
        {suffix && (
          <span style={{ display: 'flex', color: 'var(--icon-subtle)', flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
      {hint && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            fontSize: 12,
            lineHeight: '16px',
            color: hintColor,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

export default Input;
