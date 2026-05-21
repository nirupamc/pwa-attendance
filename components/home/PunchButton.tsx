"use client";

import { Fingerprint } from "lucide-react";

interface PunchButtonProps {
  isIn: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const PunchButton = ({ isIn, disabled, onClick }: PunchButtonProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        className={`relative flex h-44 w-44 items-center justify-center rounded-full transition-all ${
          disabled
            ? "bg-surface-2 text-text-muted"
            : "bg-primary text-background hover:bg-primary-dark"
        }`}
        onClick={onClick}
        disabled={disabled}
      >
        {!disabled && (
          <span className="absolute -inset-3 rounded-full border border-primary/40 animate-pulse" />
        )}
        <Fingerprint size={48} />
      </button>
      <span className="font-heading text-2xl uppercase tracking-[4px] text-primary">
        {isIn ? "Punch Out" : "Punch In"}
      </span>
      <p className="text-xs text-text-muted">
        {disabled ? "Offline — punch disabled" : "Scan the office QR code"}
      </p>
    </div>
  );
};
