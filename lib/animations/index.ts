import gsap from "gsap";

// ── Shared easing constants ──────────────────────────────────────────────────
export const EASE = {
  smooth: "power2.out",
  snappy: "power3.out",
  gentle: "power1.inOut",
  spring: "back.out(1.5)",
  springLight: "back.out(1.2)",
} as const;

// ── Stagger fade-up entrance ─────────────────────────────────────────────────
export function staggerIn(
  targets: Element[] | NodeListOf<Element> | string,
  delay = 0
) {
  return gsap.fromTo(
    targets,
    { opacity: 0, y: 18, filter: "blur(6px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.5,
      stagger: 0.08,
      ease: EASE.smooth,
      delay,
      clearProps: "filter",
    }
  );
}

// ── Punch button press feedback ──────────────────────────────────────────────
export function punchPressIn(el: Element) {
  return gsap.to(el, { scale: 0.93, duration: 0.12, ease: "power2.in" });
}

export function punchPressOut(el: Element) {
  return gsap.to(el, { scale: 1, duration: 0.25, ease: EASE.spring });
}

// ── Punch success bounce ─────────────────────────────────────────────────────
export function punchSuccess(el: Element) {
  return gsap
    .timeline()
    .to(el, { scale: 0.9, duration: 0.1, ease: "power2.in" })
    .to(el, { scale: 1.08, duration: 0.22, ease: "back.out(2.2)" })
    .to(el, { scale: 1, duration: 0.18, ease: EASE.gentle });
}

// ── Fade + slide in a single element ────────────────────────────────────────
export function fadeSlideIn(
  el: Element,
  from: { y?: number; x?: number; opacity?: number } = { y: 12, opacity: 0 },
  duration = 0.35
) {
  return gsap.fromTo(
    el,
    { opacity: from.opacity ?? 0, y: from.y ?? 0, x: from.x ?? 0 },
    { opacity: 1, y: 0, x: 0, duration, ease: EASE.smooth, clearProps: "all" }
  );
}

// ── Fade out ─────────────────────────────────────────────────────────────────
export function fadeOut(el: Element, duration = 0.25) {
  return gsap.to(el, { opacity: 0, y: -8, duration, ease: EASE.gentle });
}
