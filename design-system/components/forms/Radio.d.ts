import React from 'react';

export interface RadioProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  name?: string;
  value?: string;
  onChange?: (value?: string) => void;
  id?: string;
  style?: React.CSSProperties;
}

/** 18×18 radio button, ink ring + ink dot when selected. */
export function Radio(props: RadioProps): JSX.Element;
export default Radio;
