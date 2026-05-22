"use client";

import { useCallback, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import { punchPressIn, punchPressOut } from "@/lib/animations";

interface PunchButtonProps {
  isIn: boolean;
  disabled?: boolean;
  helperText?: string;
  onClick: () => void;
}

export const PunchButton = ({
  isIn,
  disabled,
  helperText,
  onClick,
}: PunchButtonProps) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<number[]>([]);

  const handlePointerDown = useCallback(() => {
    if (disabled || !btnRef.current) return;
    punchPressIn(btnRef.current);
  }, [disabled]);

  const handlePointerUp = useCallback(() => {
    if (disabled || !btnRef.current) return;
    punchPressOut(btnRef.current);
  }, [disabled]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    // spawn a ripple
    const id = Date.now();
    setRipples((prev) => [...prev, id]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r !== id)), 600);
    onClick();
  }, [disabled, onClick]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Outer orbit ring — only when active (punched in) */}
      <div className="relative flex items-center justify-center">
        {!disabled && isIn && (
          <span
            className="pointer-events-none absolute -inset-5 rounded-full border border-primary/20 animate-glow-pulse"
            aria-hidden
          />
        )}
        {!disabled && (
          <span
            className="pointer-events-none absolute -inset-3 rounded-full border border-primary/30"
            style={{
              animation: disabled ? "none" : "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
            }}
            aria-hidden
          />
        )}

        <button
          ref={btnRef}
          className={[
            "relative flex h-44 w-44 items-center justify-center rounded-full",
            "overflow-hidden select-none outline-none",
            "transition-colors duration-300",
            disabled
              ? "bg-surface-2 text-text-muted cursor-not-allowed"
              : isIn
              ? "bg-primary text-background animate-glow-pulse"
              : "bg-primary text-background",
          ].join(" ")}
          style={{ willChange: "transform" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          disabled={disabled}
          aria-label={isIn ? "Punch Out" : "Punch In"}
        >
          {/* Ripple layers */}
          {ripples.map((id) => (
            <span
              key={id}
              className="pointer-events-none absolute inset-0 rounded-full bg-white/20 animate-ripple"
              aria-hidden
            />
          ))}

          <Fingerprint
            size={48}
            className="relative z-10 transition-transform duration-200"
          />
        </button>
      </div>

      <span
        className={[
          "font-heading text-2xl uppercase tracking-[4px] transition-colors duration-300",
          disabled ? "text-text-muted" : "text-primary",
        ].join(" ")}
      >
        {isIn ? "Punch Out" : "Punch In"}
      </span>
      <p
        className={[
          "text-xs text-center max-w-[220px] transition-colors duration-300",
          disabled ? "text-danger" : "text-text-muted",
        ].join(" ")}
      >
        {helperText ??
          (disabled
            ? "Connect to office WiFi to punch in"
            : "Scan the office QR code")}
      </p>
    </div>
  );
};
