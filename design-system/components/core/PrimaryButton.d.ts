import * as React from 'react';
export interface PrimaryButtonProps {
  className?: string;
  style?: React.CSSProperties;
  buttonLabel?: string;
  style2?: "default" | "square" | "small" | "small square";
  suffixIcon?: React.ReactNode;
  showSuffix?: boolean;
  prefixIcon?: React.ReactNode;
  showLabel?: boolean;
  showPrefix?: boolean;
}
export declare const PrimaryButton: React.FC<PrimaryButtonProps>;
export default PrimaryButton;
