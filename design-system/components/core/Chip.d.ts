import * as React from 'react';
export interface ChipProps {
  className?: string;
  style?: React.CSSProperties;
  prefixIcon?: boolean;
  style2?: "neutral" | "accent" | "success" | "warning" | "critical";
  icon?: React.ReactNode;
  /** Text content; defaults to "NEUTRAL". */
  text1?: string;
}
export declare const Chip: React.FC<ChipProps>;
export default Chip;
