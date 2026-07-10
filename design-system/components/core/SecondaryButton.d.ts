import * as React from 'react';
export interface SecondaryButtonProps {
  className?: string;
  style?: React.CSSProperties;
  showSuffix?: boolean;
  buttonLabel?: string;
  style2?: "default" | "square" | "small" | "small square";
  showPrefix?: boolean;
  suffixIcon?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  showLabel?: boolean;
}
export declare const SecondaryButton: React.FC<SecondaryButtonProps>;
export default SecondaryButton;
