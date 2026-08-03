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
export function ZoomToFit({ children, minScale = 0.3, className }: ZoomToFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ scale: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Content usually arrives in two waves: the table renders with its
    // loading/empty state, then real rows land a moment later and it gets
    // wider. Measuring both waves means applying two different scales, and
    // the user watches the whole table visibly shrink a beat after it
    // appears. So stay hidden until the measurement stops changing, and
    // only then reveal -- one paint, at the final size.
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let lastScale: number | null = null;

    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const naturalWidth = inner.scrollWidth;
      const naturalHeight = inner.scrollHeight;
      const availableWidth = outer.clientWidth;
      if (!naturalWidth || !availableWidth) return;

      const fits = naturalWidth <= availableWidth;
      const scale = fits ? 1 : Math.max(minScale, availableWidth / naturalWidth);
      setDims(fits ? null : { scale, height: naturalHeight * scale });

      // Reveal once the scale has held steady briefly. Any further change
      // restarts the wait, so a late-arriving data load re-settles before
      // anything is shown.
      if (scale !== lastScale) {
        lastScale = scale;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => setReady(true), 150);
      }
    };

    measure();
    // Hard backstop: if content somehow never settles (e.g. it keeps
    // updating), show it anyway rather than leaving a blank space.
    revealTimer = setTimeout(() => setReady(true), 1500);

    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => {
      ro.disconnect();
      clearTimeout(settleTimer);
      clearTimeout(revealTimer);
    };
  }, [minScale]);

  return (
    <div
      ref={outerRef}
      style={{
        // overflow/width must stay set unconditionally (not just once a
        // scale is computed) -- otherwise, on the very first measurement
        // pass, the unconstrained table's overflow bleeds upward through
        // any flex-1 ancestor (which defaults to min-width: auto) and
        // inflates this element's own clientWidth to match, making
        // naturalWidth <= availableWidth trivially true and defeating the
        // whole measurement.
        width: "100%",
        overflow: "hidden",
        ...(dims ? { height: dims.height } : null),
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
