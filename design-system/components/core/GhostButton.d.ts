import * as React from 'react';
export interface GhostButtonProps {
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
export declare const GhostButton: React.FC<GhostButtonProps>;
export default GhostButton;
