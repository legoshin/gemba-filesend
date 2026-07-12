import React from 'react';

export interface InputProps {
  /** Bold field label shown above the control. */
  label?: string;
  /** Helper / validation text below the control. */
  hint?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  /** Visual state — drives the ring + hint colour. */
  state?: 'default' | 'error' | 'success' | 'disabled';
  /** Leading node (usually an <Icon />). */
  prefix?: React.ReactNode;
  /** Trailing node (icon or short text). */
  suffix?: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Labelled text input. 40px tall, 8px radius, hairline ring, soft shadow.
 * @startingPoint section="Forms" subtitle="Labelled text field with states" viewport="360x120"
 */
export function Input(props: InputProps): JSX.Element;
export default Input;
