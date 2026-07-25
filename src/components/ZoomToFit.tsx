import { useEffect, useRef, useState, ReactNode } from "react";

interface ZoomToFitProps {
  children: ReactNode;
  minScale?: number;
  className?: string;
}

// Measures its content's natural (unconstrained) width and, if it's wider
// than the space available, shrinks the whole thing down with a CSS
// transform so it fits on screen without needing a horizontal scroll --
// used for admin tables that have too many columns to fit on a phone.
export function ZoomToFit({ children, minScale = 0.55, className }: ZoomToFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ scale: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const naturalWidth = inner.scrollWidth;
      const naturalHeight = inner.scrollHeight;
      const availableWidth = outer.clientWidth;
      if (!naturalWidth || !availableWidth) return;

      if (naturalWidth <= availableWidth) {
        setDims(null);
      } else {
        const scale = Math.max(minScale, availableWidth / naturalWidth);
        setDims({ scale, height: naturalHeight * scale });
      }
      setReady(true);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [minScale]);

  return (
    <div
      ref={outerRef}
      style={{
        ...(dims ? { height: dims.height, overflow: "hidden" } : null),
        visibility: ready ? "visible" : "hidden",
      }}
    >
      <div
        ref={innerRef}
        className={className}
        style={
          dims
            ? { transform: `scale(${dims.scale})`, transformOrigin: "top left", width: `${100 / dims.scale}%` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
