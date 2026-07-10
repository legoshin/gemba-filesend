import * as React from 'react';
export interface StoreDownloadButtonProps {
  className?: string;
  style?: React.CSSProperties;
  store?: "app store" | "google play";
  type?: "dark" | "light";
  language?: "english" | "dutch" | "french" | "german";
  /** Text content; defaults to "Télécharger dans". */
  text1?: string;
  /** Text content; defaults to "l’App Store". */
  text2?: string;
}
export declare const StoreDownloadButton: React.FC<StoreDownloadButtonProps>;
export default StoreDownloadButton;
