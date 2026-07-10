import { IconsArrowCircleBrokenRight } from './IconsArrowCircleBrokenRight.jsx';

// figma node: 5434:2390 Ghost button (4 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "style2=" + __venc(p.style2);

export function GhostButton(_p = {}) {
  const props = { ..._p, showSuffix: _p.showSuffix ?? true, buttonLabel: _p.buttonLabel ?? "Button", style2: _p.style2 ?? "default", showPrefix: _p.showPrefix ?? true, showLabel: _p.showLabel ?? true };
  const __body0 = () => (
    <div className={props.className} style={{
      width: 149,
      height: 40,
      borderRadius: 24,
      display: "flex",
      flexDirection: "row",
      gap: 8,
      padding: "12px 24px 12px 24px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.showPrefix && (
      <div style={{
          position: "relative",
          width: 20,
          height: 20,
          flexShrink: 0,
        }}>{props.prefixIcon ?? <IconsArrowCircleBrokenRight />}</div>
      )}
      {props.showLabel && (
      <span style={{
        position: "relative",
        fontFamily: "\"Public Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: "20px",
        color: "var(--text-primary)",
        flexShrink: 0,
      }}>{props.buttonLabel}</span>
      )}
      {props.showSuffix && (
      <div style={{
          position: "relative",
          width: 20,
          height: 20,
          flexShrink: 0,
        }}>{props.suffixIcon ?? <IconsArrowCircleBrokenRight />}</div>
      )}
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: 149,
      height: 40,
      borderRadius: 8,
      display: "flex",
      flexDirection: "row",
      gap: 8,
      padding: "12px 24px 12px 24px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.showPrefix && (
      <div style={{
          position: "relative",
          width: 20,
          height: 20,
          flexShrink: 0,
        }}>{props.prefixIcon ?? <IconsArrowCircleBrokenRight />}</div>
      )}
      {props.showLabel && (
      <span style={{
        position: "relative",
        fontFamily: "\"Public Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: "20px",
        color: "var(--text-primary)",
        flexShrink: 0,
      }}>{props.buttonLabel}</span>
      )}
      {props.showSuffix && (
      <div style={{
          position: "relative",
          width: 20,
          height: 20,
          flexShrink: 0,
        }}>{props.suffixIcon ?? <IconsArrowCircleBrokenRight />}</div>
      )}
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 32,
      borderRadius: 24,
      display: "flex",
      flexDirection: "row",
      gap: 8,
      padding: "12px 16px 12px 16px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.showPrefix && (
      <div style={{
          position: "relative",
          width: 16,
          height: 16,
          flexShrink: 0,
        }}>{props.prefixIcon ?? <IconsArrowCircleBrokenRight style={{ transform: "scale(0.800, 0.800)", transformOrigin: "0 0" }} />}</div>
      )}
      {props.showLabel && (
      <span style={{
        position: "relative",
        fontFamily: "\"Public Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: "20px",
        color: "var(--text-primary)",
        flexShrink: 0,
      }}>{props.buttonLabel}</span>
      )}
      {props.showSuffix && (
      <div style={{
          position: "relative",
          width: 16,
          height: 16,
          flexShrink: 0,
        }}>{props.suffixIcon ?? <IconsArrowCircleBrokenRight style={{ transform: "scale(0.800, 0.800)", transformOrigin: "0 0" }} />}</div>
      )}
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 32,
      borderRadius: 8,
      display: "flex",
      flexDirection: "row",
      gap: 8,
      padding: "12px 16px 12px 16px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.showPrefix && (
      <div style={{
          position: "relative",
          width: 16,
          height: 16,
          flexShrink: 0,
        }}>{props.prefixIcon ?? <IconsArrowCircleBrokenRight style={{ transform: "scale(0.800, 0.800)", transformOrigin: "0 0" }} />}</div>
      )}
      {props.showLabel && (
      <span style={{
        position: "relative",
        fontFamily: "\"Public Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        lineHeight: "20px",
        color: "var(--text-primary)",
        flexShrink: 0,
      }}>{props.buttonLabel}</span>
      )}
      {props.showSuffix && (
      <div style={{
          position: "relative",
          width: 16,
          height: 16,
          flexShrink: 0,
        }}>{props.suffixIcon ?? <IconsArrowCircleBrokenRight style={{ transform: "scale(0.800, 0.800)", transformOrigin: "0 0" }} />}</div>
      )}
    </div>
  );
  const __impls = {
    // figma: Style=Default
    "style2=default": __body0,
    // figma: Style= Square
    "style2=square": __body1,
    // figma: Style= Small
    "style2=small": __body2,
    // figma: Style= Small Square
    "style2=small square": __body3,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default GhostButton;
