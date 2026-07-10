import React from 'react';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
  id?: string;
  style?: React.CSSProperties;
}

/** 18×18 checkbox, 6px radius. Ink fill + white tick when on. */
export function Checkbox(props: CheckboxProps): JSX.Element;
export default Checkbox;
