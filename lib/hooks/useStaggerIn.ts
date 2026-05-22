"use client";

import { useEffect, useRef } from "react";
import { staggerIn } from "@/lib/animations";

/**
 * Attaches a GSAP stagger-in animation to all direct children
 * that carry `data-animate` attribute inside the returned containerRef.
 */
export function useStaggerIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll("[data-animate]");
    if (els.length === 0) return;
    const tween = staggerIn(els, delay);
    return () => {
      tween.kill();
    };
  }, [delay]);

  return ref;
}
