// components/UI/Dropdown.tsx
"use client";
import React, { useState, ReactNode, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export function Dropdown({
  trigger,
  children,
  align = "right",
  fullWidth = false,
  customWidth,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode | ((opts: { close: () => void }) => ReactNode);
  align?: "left" | "right";
  fullWidth?: boolean;
  customWidth?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width?: number;
    position?: "below" | "above";
  } | null>(null);

  const computePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    // Estimate popup height (will be replaced by actual popup height when available)
    const estimatedPopupHeight = 320;
    // If popup is rendered, prefer its actual height to avoid jumpy above/below toggles
    const actualPopupHeight = popupRef.current?.offsetHeight || 0;
    const popupHeight = actualPopupHeight || estimatedPopupHeight;
    const gap = 8;

    // Calculate space available below and above
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Determine if we have enough space below, if not use above
    // Also consider scrollY to prevent positioning off-screen in long pages
    // Add hysteresis to prevent jumping: only switch if space difference is significant
    const minSpaceThreshold = 50; // Minimum extra space needed to prefer below
    const shouldShowAbove =
      spaceBelow < popupHeight - minSpaceThreshold && spaceAbove > popupHeight;

    // Calculate top position
    // If showing above: top edge of trigger + scroll - popup height - gap
    // If showing below: bottom edge of trigger + scroll + gap
    let finalTop = shouldShowAbove
      ? rect.top + scrollY - popupHeight - gap
      : rect.bottom + scrollY + gap;

    // Safety check: ensure popup top is not negative (off-screen top)
    if (finalTop < scrollY + gap) {
      finalTop = scrollY + gap;
    }

    if (fullWidth) {
      const viewportWidth = window.innerWidth;
      // Ensure the popup is exactly as wide as the trigger, but not wider than viewport minus padding
      // Also clamp to a maximum logical width if needed, but primarily match trigger width
      const maxAllowed = Math.min(viewportWidth - 32, 600);
      const popupWidth = Math.min(rect.width, maxAllowed);

      // Align left to the trigger element where possible
      let left = rect.left + scrollX;

      // If it overflows right, adjust left
      if (left + popupWidth > viewportWidth - 16) {
        left = viewportWidth - popupWidth - 16;
      }

      // If it overflows left, clamp to 16
      if (left < 16) left = 16;

      setCoords({
        top: finalTop,
        left,
        width: popupWidth,
        position: shouldShowAbove ? "above" : "below",
      });
      return;
    }
    // Fixed compact width for dropdown menus
    let popupWidth = customWidth || 180; // Fixed width: 180px (sm) or 200px (md)
    if (
      !customWidth &&
      typeof window !== "undefined" &&
      window.innerWidth >= 768
    ) {
      popupWidth = 200; // md: fixed 200px
    }

    // Default: align right (popup right edge aligns with trigger right edge)
    // Calculate left: trigger.right - popupWidth
    let left = rect.right + scrollX - popupWidth;

    // If aligning left, use trigger left edge
    if (align === "left") {
      left = rect.left + scrollX;
    }

    // Boundary checks
    // 1. Ensure doesn't go off-screen left
    if (left < 8) left = 8;

    // 2. Ensure doesn't go off-screen right
    const maxLeft = window.innerWidth + scrollX - popupWidth - 8;
    if (left > maxLeft) left = maxLeft;

    setCoords({
      top: finalTop,
      left,
      width: popupWidth,
      position: shouldShowAbove ? "above" : "below",
    });
  };

  useEffect(() => {
    if (open) {
      computePos();
      let rafId: number | null = null;
      let lastScrollY = window.scrollY;

      const onScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = Math.abs(currentScrollY - lastScrollY);

          // Only reposition if scrolled significantly or if dropdown might be off-screen
          if (scrollDelta > 50 || !coords) {
            computePos();
            lastScrollY = currentScrollY;
          }
        });
      };
      const onResize = () => computePos();
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onResize);
      const onDocClick = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (
          popupRef.current &&
          !popupRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setOpen(false);
          onOpenChange?.(false);
        }
      };
      document.addEventListener("mousedown", onDocClick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("mousedown", onDocClick);
      };
    }
    return;
  }, [open, align, fullWidth]);

  return (
    <div
      className={fullWidth ? "relative block w-full" : "relative inline-block"}
    >
      <div
        ref={triggerRef}
        onClick={() => {
          setOpen((s) => {
            const next = !s;
            if (next) {
              // Use setTimeout to let the state update first
              setTimeout(() => {
                computePos();
              }, 0);
            }
            onOpenChange?.(next);
            return next;
          });
        }}
      >
        {trigger}
      </div>
      {open && coords
        ? createPortal(
            <div
              ref={popupRef}
              style={{
                position: "absolute",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 99999,
                willChange: "transform",
                overflow: "hidden",
              }}
              className={clsx(
                "rounded-md shadow-lg border border-white/6 z-50",
              )}
            >
              <div
                style={{
                  backgroundColor: "rgba(6,8,12,0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderRadius: 8,
                  boxSizing: "border-box",
                }}
                className="w-full p-2"
              >
                {typeof children === "function"
                  ? children({
                      close: () => {
                        setOpen(false);
                        onOpenChange?.(false);
                      },
                    })
                  : children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
