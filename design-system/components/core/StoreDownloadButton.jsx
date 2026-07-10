// figma node: 1864:687 Store download button (16 variants)
const __venc = (v) => String(v).replace(/[%|=]/g, encodeURIComponent);
const __vkey = (p) => "store=" + __venc(p.store) + '|' + "type=" + __venc(p.type) + '|' + "language=" + __venc(p.language);

export function StoreDownloadButton(_p = {}) {
  const props = { ..._p, store: _p.store ?? "app store", type: _p.type ?? "dark", language: _p.language ?? "english" };
  const __body0 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      color: "rgb(255,255,255)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 7,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Télécharger dans"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 17,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "l’App Store"}</span>
      </div>
    </div>
  );
  const __body1 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      color: "rgb(255,255,255)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Download in de"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body2 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      color: "rgb(255,255,255)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Laden im"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body3 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      color: "rgb(255,255,255)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Download on the"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body4 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5.5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 9,
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Ontdek het op"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(255,255,255)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body5 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5.5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 9,
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Disponible sur"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(255,255,255)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body6 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 10,
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Jetzt bei"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(255,255,255)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body7 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(0,0,0)",
      boxShadow: "inset 0 0 0 1px rgb(166,166,166)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 10,
          lineHeight: "100%",
          color: "rgb(255,255,255)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "GET IT ON"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(255,255,255)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body8 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      color: "rgb(0,0,0)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 7,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Télécharger dans"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 17,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "l’App Store"}</span>
      </div>
    </div>
  );
  const __body9 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      color: "rgb(0,0,0)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Download in de"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body10 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      color: "rgb(0,0,0)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Laden im"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body11 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      color: "rgb(0,0,0)",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 20,
        height: 24,
      }}>
        <svg width={20} height={18.211} viewBox="0 0 20 18.211" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 5.789,
          width: 20,
          height: 18.211,
        }}>
          <path d={"M 16.705 6.974 C 16.717 6.054 16.967 5.152 17.432 4.352 C 17.897 3.552 18.562 2.88 19.365 2.398 C 18.855 1.687 18.182 1.102 17.4 0.689 C 16.618 0.276 15.748 0.047 14.859 0.02 C 12.964 -0.175 11.126 1.127 10.16 1.127 C 9.175 1.127 7.688 0.039 6.086 0.071 C 5.05 0.104 4.041 0.398 3.156 0.925 C 2.271 1.452 1.541 2.193 1.037 3.078 C -1.146 6.768 0.482 12.192 2.573 15.175 C 3.62 16.636 4.843 18.267 6.443 18.209 C 8.009 18.146 8.593 17.234 10.484 17.234 C 12.356 17.234 12.905 18.209 14.537 18.173 C 16.218 18.146 17.276 16.705 18.286 15.231 C 19.038 14.19 19.616 13.04 20 11.822 C 19.024 11.419 18.191 10.745 17.605 9.882 C 17.019 9.02 16.706 8.009 16.705 6.974 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={4.939} height={5.534} viewBox="0 0 4.939 5.534" fill="none" style={{
          position: "absolute",
          left: 9.956,
          top: 0,
          width: 4.939,
          height: 5.534,
        }}>
          <path d={"M 3.665 3.847 C 4.581 2.773 5.032 1.393 4.923 0 C 3.524 0.144 2.231 0.797 1.302 1.829 C 0.848 2.334 0.501 2.92 0.279 3.556 C 0.057 4.192 -0.034 4.864 0.011 5.534 C 0.711 5.541 1.404 5.393 2.037 5.101 C 2.67 4.808 3.226 4.38 3.665 3.847 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 6.5,
        width: 78,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Text\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: "9px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Download on the"}</span>
        <span style={{
          position: "relative",
          fontFamily: "\"SF Compact Display\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1,
          letterSpacing: "-0.470px",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text2 ?? "App Store"}</span>
      </div>
    </div>
  );
  const __body12 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5.5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 9,
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Ontdek het op"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(0,0,0)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body13 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5.5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 9,
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Disponible sur"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(0,0,0)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body14 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 10,
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "Jetzt bei"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(0,0,0)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __body15 = () => (
    <div className={props.className} style={{
      width: 120,
      height: 40,
      overflow: "hidden",
      borderRadius: 6,
      backgroundColor: "rgb(255,255,255)",
      boxShadow: "inset 0 0 0 1px rgb(0,0,0)",
      position: "relative",
      ...props.style,
    }}>
      <div style={{
        position: "absolute",
        left: 8,
        top: 8,
        width: 21,
        height: 24,
      }}>
        <svg width={14.833} height={12.538} viewBox="0 0 14.833 12.538" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.090,24)",
          transformOrigin: "0 0",
          width: 14.833,
          height: 12.538,
          color: "rgb(234,67,53)",
        }}>
          <path d={"M 9.715 12.538 L 0 1.994 C 0.001 1.992 0.001 1.989 0.002 1.988 C 0.3 0.843 1.322 0 2.536 0 C 3.021 0 3.477 0.134 3.867 0.37 L 3.898 0.388 L 14.833 6.841 L 9.715 12.538 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={11.416} height={10.297} viewBox="0 0 11.416 10.297" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,9.584,17.158)",
          transformOrigin: "0 0",
          width: 11.416,
          height: 10.297,
          color: "rgb(251,188,4)",
        }}>
          <path d={"M 10.049 7.492 L 10.04 7.499 L 5.319 10.297 L 0 5.457 L 5.338 0 L 10.034 2.77 C 10.857 3.226 11.416 4.113 11.416 5.136 C 11.416 6.153 10.865 7.036 10.049 7.492 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={10.139} height={20.013} viewBox="0 0 10.139 20.013" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0,22.006)",
          transformOrigin: "0 0",
          width: 10.139,
          height: 20.013,
          color: "rgb(66,133,244)",
        }}>
          <path d={"M 0.089 20.013 C 0.031 19.792 0 19.561 0 19.322 L 0 0.69 C 0 0.451 0.031 0.219 0.09 0 L 10.139 10.275 L 0.089 20.013 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
        <svg width={14.815} height={12} viewBox="0 0 14.815 12" fill="none" style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: "matrix(1,0,0,-1,0.089,12)",
          transformOrigin: "0 0",
          width: 14.815,
          height: 12,
          color: "rgb(52,168,83)",
        }}>
          <path d={"M 9.787 0 L 14.815 5.141 L 3.893 11.616 C 3.496 11.86 3.032 12 2.537 12 C 1.323 12 0.299 11.155 0.001 10.01 C 0.001 10.009 0 10.008 0 10.007 L 9.787 0 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
      <div style={{
        position: "absolute",
        left: 36,
        top: 5,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        alignItems: "flex-start",
        flexWrap: "nowrap",
      }}>
        <span style={{
          position: "relative",
          fontFamily: "\"Product Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 400,
          fontSize: 10,
          lineHeight: "100%",
          color: "rgb(0,0,0)",
          flexShrink: 0,
          alignSelf: "stretch",
          whiteSpace: "nowrap",
        }}>{props.text1 ?? "GET IT ON"}</span>
        <svg width={74} height={15} viewBox="0 0 74 15" fill="none" style={{
          position: "relative",
          transform: "matrix(1,0,0,-1,0,0)",
          width: 74,
          height: 15,
          flexShrink: 0,
          color: "rgb(0,0,0)",
        }}>
          <path d={"M 57.518 3.59 L 59.147 3.59 L 59.147 14.602 L 57.518 14.602 L 57.518 3.59 Z M 72.189 10.635 L 70.322 5.861 L 70.266 5.861 L 68.328 10.635 L 66.573 10.635 L 69.479 3.963 L 67.823 0.251 L 69.521 0.251 L 74 10.635 L 72.189 10.635 Z M 62.952 4.841 C 62.418 4.841 61.674 5.11 61.674 5.777 C 61.674 6.626 62.6 6.952 63.401 6.952 C 64.116 6.952 64.454 6.796 64.889 6.583 C 64.762 5.563 63.892 4.841 62.952 4.841 Z M 63.148 10.876 C 61.969 10.876 60.747 10.352 60.242 9.19 L 61.688 8.581 C 61.997 9.19 62.572 9.389 63.176 9.389 C 64.019 9.389 64.875 8.879 64.889 7.972 L 64.889 7.859 C 64.594 8.029 63.963 8.284 63.19 8.284 C 61.632 8.284 60.045 7.419 60.045 5.805 C 60.045 4.331 61.323 3.382 62.755 3.382 C 63.85 3.382 64.454 3.878 64.833 4.459 L 64.889 4.459 L 64.889 3.609 L 66.461 3.609 L 66.461 7.831 C 66.461 9.785 65.015 10.876 63.148 10.876 M 53.082 9.295 L 50.765 9.295 L 50.765 13.069 L 53.082 13.069 C 54.3 13.069 54.991 12.052 54.991 11.182 C 54.991 10.329 54.3 9.295 53.082 9.295 Z M 53.04 14.602 L 49.138 14.602 L 49.138 3.59 L 50.765 3.59 L 50.765 7.762 L 53.04 7.762 C 54.845 7.762 56.62 9.082 56.62 11.182 C 56.62 13.283 54.845 14.602 53.04 14.602 M 31.758 4.839 C 30.633 4.839 29.691 5.79 29.691 7.095 C 29.691 8.415 30.633 9.38 31.758 9.38 C 32.869 9.38 33.741 8.415 33.741 7.095 C 33.741 5.79 32.869 4.839 31.758 4.839 Z M 33.629 10.019 L 33.572 10.019 C 33.206 10.458 32.504 10.856 31.618 10.856 C 29.761 10.856 28.06 9.21 28.06 7.095 C 28.06 4.995 29.761 3.363 31.618 3.363 C 32.504 3.363 33.206 3.76 33.572 4.215 L 33.629 4.215 L 33.629 3.675 C 33.629 2.242 32.869 1.475 31.646 1.475 C 30.647 1.475 30.028 2.199 29.775 2.81 L 28.355 2.214 C 28.763 1.22 29.846 0 31.646 0 C 33.558 0 35.176 1.135 35.176 3.902 L 35.176 10.629 L 33.629 10.629 L 33.629 10.019 Z M 36.301 3.59 L 37.932 3.59 L 37.932 14.603 L 36.301 14.603 L 36.301 3.59 Z M 40.336 7.223 C 40.294 8.67 41.447 9.408 42.277 9.408 C 42.924 9.408 43.472 9.082 43.655 8.614 L 40.336 7.223 Z M 45.399 8.472 C 45.09 9.309 44.147 10.856 42.221 10.856 C 40.308 10.856 38.72 9.338 38.72 7.109 C 38.72 5.009 40.294 3.363 42.403 3.363 C 44.105 3.363 45.09 4.413 45.498 5.023 L 44.232 5.875 C 43.81 5.251 43.233 4.839 42.403 4.839 C 41.574 4.839 40.983 5.223 40.603 5.974 L 45.567 8.047 L 45.399 8.472 Z M 5.85 9.706 L 5.85 8.117 L 9.618 8.117 C 9.506 7.223 9.211 6.57 8.761 6.117 C 8.212 5.563 7.354 4.952 5.85 4.952 C 3.529 4.952 1.715 6.84 1.715 9.181 C 1.715 11.523 3.529 13.41 5.85 13.41 C 7.102 13.41 8.016 12.913 8.69 12.275 L 9.802 13.396 C 8.859 14.304 7.608 15 5.85 15 C 2.672 15 0 12.388 0 9.181 C 0 5.974 2.672 3.363 5.85 3.363 C 7.565 3.363 8.859 3.931 9.871 4.995 C 10.913 6.045 11.236 7.521 11.236 8.713 C 11.236 9.082 11.208 9.422 11.151 9.706 L 5.85 9.706 Z M 15.521 4.839 C 14.396 4.839 13.425 5.776 13.425 7.109 C 13.425 8.458 14.396 9.38 15.521 9.38 C 16.645 9.38 17.616 8.458 17.616 7.109 C 17.616 5.776 16.645 4.839 15.521 4.839 Z M 15.521 10.856 C 13.467 10.856 11.794 9.281 11.794 7.109 C 11.794 4.952 13.467 3.363 15.521 3.363 C 17.574 3.363 19.247 4.952 19.247 7.109 C 19.247 9.281 17.574 10.856 15.521 10.856 Z M 23.65 4.839 C 22.525 4.839 21.554 5.776 21.554 7.109 C 21.554 8.458 22.525 9.38 23.65 9.38 C 24.775 9.38 25.745 8.458 25.745 7.109 C 25.745 5.776 24.775 4.839 23.65 4.839 Z M 23.65 10.856 C 21.597 10.856 19.924 9.281 19.924 7.109 C 19.924 4.952 21.597 3.363 23.65 3.363 C 25.703 3.363 27.376 4.952 27.376 7.109 C 27.376 9.281 25.703 10.856 23.65 10.856 Z"} fill="currentColor" fillRule="nonzero" />
        </svg>
      </div>
    </div>
  );
  const __impls = {
    // figma: Store=App Store, Type=Dark, Language=French
    "store=app store|type=dark|language=french": __body0,
    // figma: Store=App Store, Type=Dark, Language=Dutch
    "store=app store|type=dark|language=dutch": __body1,
    // figma: Store=App Store, Type=Dark, Language=German
    "store=app store|type=dark|language=german": __body2,
    // figma: Store=App Store, Type=Dark, Language=English
    "store=app store|type=dark|language=english": __body3,
    // figma: Store=Google Play, Type=Dark, Language=Dutch
    "store=google play|type=dark|language=dutch": __body4,
    // figma: Store=Google Play, Type=Dark, Language=French
    "store=google play|type=dark|language=french": __body5,
    // figma: Store=Google Play, Type=Dark, Language=German
    "store=google play|type=dark|language=german": __body6,
    // figma: Store=Google Play, Type=Dark, Language=English
    "store=google play|type=dark|language=english": __body7,
    // figma: Store=App Store, Type=Light, Language=French
    "store=app store|type=light|language=french": __body8,
    // figma: Store=App Store, Type=Light, Language=Dutch
    "store=app store|type=light|language=dutch": __body9,
    // figma: Store=App Store, Type=Light, Language=German
    "store=app store|type=light|language=german": __body10,
    // figma: Store=App Store, Type=Light, Language=English
    "store=app store|type=light|language=english": __body11,
    // figma: Store=Google Play, Type=Light, Language=Dutch
    "store=google play|type=light|language=dutch": __body12,
    // figma: Store=Google Play, Type=Light, Language=French
    "store=google play|type=light|language=french": __body13,
    // figma: Store=Google Play, Type=Light, Language=German
    "store=google play|type=light|language=german": __body14,
    // figma: Store=Google Play, Type=Light, Language=English
    "store=google play|type=light|language=english": __body15,
  };
  return (__impls[__vkey(props)] ?? __body3)();
}
export default StoreDownloadButton;
