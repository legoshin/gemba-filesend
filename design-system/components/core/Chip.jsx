import { Asterisk01 } from './Asterisk01.jsx';

// figma node: 5700:2016 Chip (5 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "style2=" + __venc(p.style2);

export function Chip(_p = {}) {
  const props = { ..._p, prefixIcon: _p.prefixIcon ?? true, style2: _p.style2 ?? "neutral" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 20,
      borderRadius: 16,
      backgroundColor: "var(--signal-neutral-subdued)",
      display: "flex",
      flexDirection: "row",
      gap: 4,
      padding: "3px 10px 3px 10px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.prefixIcon && (
      <div style={{
          position: "relative",
          width: 16,
          transform: "matrix(1,0,0,-1,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon ?? <Asterisk01 />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "\"PT Root UI VF\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "var(--signal-neutral)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "NEUTRAL"}</span>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 20,
      borderRadius: 16,
      backgroundColor: "rgba(32,102,230,0.08)",
      display: "flex",
      flexDirection: "row",
      gap: 4,
      padding: "3px 10px 3px 10px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.prefixIcon && (
      <div style={{
          position: "relative",
          width: 16,
          transform: "matrix(-1,0,0,1,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon ?? <Asterisk01 />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "\"PT Root UI VF\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "var(--signal-accent)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "ACCENT"}</span>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 20,
      borderRadius: 16,
      backgroundColor: "rgba(32,152,46,0.08)",
      display: "flex",
      flexDirection: "row",
      gap: 4,
      padding: "3px 10px 3px 10px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.prefixIcon && (
      <div style={{
          position: "relative",
          width: 16,
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon ?? <Asterisk01 />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "\"PT Root UI VF\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "var(--signal-success)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "SUCCESS"}</span>
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 20,
      borderRadius: 16,
      backgroundColor: "rgba(205,140,0,0.08)",
      display: "flex",
      flexDirection: "row",
      gap: 4,
      padding: "3px 10px 3px 10px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.prefixIcon && (
      <div style={{
          position: "relative",
          width: 16,
          transform: "matrix(-1,0,0,1,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon ?? <Asterisk01 />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "\"PT Root UI VF\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "var(--signal-warning)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "WARNING"}</span>
    </div>
  );
  const __body4 = () => (
    <div className={props.className} style={{
      width: "fit-content",
      height: 20,
      borderRadius: 16,
      backgroundColor: "rgba(233,94,94,0.08)",
      display: "flex",
      flexDirection: "row",
      gap: 4,
      padding: "3px 10px 3px 10px",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      boxSizing: "border-box",
      position: "relative",
      ...props.style,
    }}>
      {props.prefixIcon && (
      <div style={{
          position: "relative",
          width: 16,
          transform: "matrix(-1,0,0,1,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          height: "auto",
        }}>{props.icon ?? <Asterisk01 />}</div>
      )}
      <span style={{
        position: "relative",
        fontFamily: "\"PT Root UI VF\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
        fontWeight: 700,
        fontSize: 10,
        whiteSpace: "nowrap",
        lineHeight: "16px",
        color: "var(--signal-critical)",
        flexShrink: 0,
        alignSelf: "stretch",
      }}>{props.text1 ?? "CRITICAL"}</span>
    </div>
  );
  const __impls = {
    // figma: Style=NEUTRAL
    "style2=neutral": __body0,
    // figma: Style=ACCENT
    "style2=accent": __body1,
    // figma: Style=SUCCESS
    "style2=success": __body2,
    // figma: Style=WARNING
    "style2=warning": __body3,
    // figma: Style=CRITICAL
    "style2=critical": __body4,
  };
  return (__impls[__vkey(props)] ?? __body0)();
}
export default Chip;
