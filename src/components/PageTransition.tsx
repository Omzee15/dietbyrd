import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const PHRASE = "Consistency beats perfection";

export function PageTransition() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    // Only show on route change, not on first load
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 900);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 22, 40, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        animation: "pageTransitionFade 0.9s ease forwards",
      }}
    >
      <style>{`
        @keyframes pageTransitionFade {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <p
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.2rem, 3vw, 2rem)",
          fontStyle: "italic",
          color: "#fff",
          fontWeight: 600,
          letterSpacing: "0.01em",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        {PHRASE}
      </p>
    </div>
  );
}
