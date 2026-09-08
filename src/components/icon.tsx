import * as React from "react";
import iconData from "./icon-data.js";

export type IconProps = { name: string; size?: number } & React.SVGProps<SVGSVGElement>;

// icon-data.js has no matching .d.ts, so TS infers a narrow literal-key object
// type from the JS module; widen it to a string-indexable map so lookups by
// an arbitrary `name: string` type-check under strict mode.
const icons: Record<string, { viewBox: string; body: string }> = iconData;

export function Icon({ name, size = 24, ...rest }: IconProps) {
  const d = icons[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={d.viewBox}
      fill="none"
      // body strings are emitter-controlled <path> markup — geometry,
      // numeric fills and transforms only; no .fig-authored text reaches them.
      dangerouslySetInnerHTML={{ __html: d.body }}
      {...rest}
    />
  );
}
export default Icon;
