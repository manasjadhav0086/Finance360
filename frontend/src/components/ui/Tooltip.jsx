import { createPortal } from "react-dom";
import { useState, useRef, useLayoutEffect } from "react";

export default function Tooltip({ children, content, position = "bottom", className = "" }) {
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState(null);
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const r = targetRect;
    const t = tooltipRef.current.getBoundingClientRect();
    const padding = 10;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let preferredPos = position;

    // Flip vertical if out of bounds
    if (preferredPos === "bottom" && r.bottom + gap + t.height > vh - padding) {
      if (r.top - gap - t.height >= padding) {
        preferredPos = "top";
      }
    } else if (preferredPos === "top" && r.top - gap - t.height < padding) {
      if (r.bottom + gap + t.height <= vh - padding) {
        preferredPos = "bottom";
      }
    }

    // Flip horizontal if out of bounds
    if (preferredPos === "right" && r.right + gap + t.width > vw - padding) {
      if (r.left - gap - t.width >= padding) {
        preferredPos = "left";
      }
    } else if (preferredPos === "left" && r.left - gap - t.width < padding) {
      if (r.right + gap + t.width <= vw - padding) {
        preferredPos = "right";
      }
    }

    let top = 0;
    let left = 0;

    if (preferredPos === "top") {
      top = r.top - gap - t.height;
      left = r.left + r.width / 2 - t.width / 2;
    } else if (preferredPos === "bottom") {
      top = r.bottom + gap;
      left = r.left + r.width / 2 - t.width / 2;
    } else if (preferredPos === "left") {
      top = r.top + r.height / 2 - t.height / 2;
      left = r.left - gap - t.width;
    } else if (preferredPos === "right") {
      top = r.top + r.height / 2 - t.height / 2;
      left = r.right + gap;
    }

    // Clamp inside viewport
    left = Math.max(padding, Math.min(left, vw - t.width - padding));
    top = Math.max(padding, Math.min(top, vh - t.height - padding));

    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      opacity: 1,
    });
  }, [targetRect, position]);

  if (!content) return children;

  return (
    <>
      <span
        className={`inline-flex ${className}`}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTargetRect(rect);
          setTooltipStyle({
            top: "-9999px",
            left: "-9999px",
            opacity: 0,
          });
        }}
        onMouseLeave={() => {
          setTargetRect(null);
          setTooltipStyle(null);
        }}
      >
        {children}
      </span>

      {targetRect &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] px-2.5 py-1 text-xs font-medium text-slate-100 bg-slate-900 rounded-md shadow-xl border border-slate-700/60 pointer-events-none whitespace-nowrap transition-opacity duration-150"
            style={
              tooltipStyle || {
                top: "-9999px",
                left: "-9999px",
                opacity: 0,
              }
            }
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}