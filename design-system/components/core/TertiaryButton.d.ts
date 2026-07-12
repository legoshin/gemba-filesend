import * as React from 'react';
export interface TertiaryButtonProps {
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
export declare const TertiaryButton: React.FC<TertiaryButtonProps>;
export default TertiaryButton;
