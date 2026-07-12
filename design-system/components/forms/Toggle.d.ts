import React from 'react';

export interface ToggleProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
  id?: string;
  style?: React.CSSProperties;
}

/** 36×20 switch, 16px knob. Ink track when on. */
export function Toggle(props: ToggleProps): JSX.Element;
export default Toggle;
