"use client";

interface StatCardProps {
  label: string;
  value: number;
}

export const StatCard = ({ label, value }: StatCardProps) => (
  <div
    className="rounded-xl border border-border border-l-[3px] border-l-primary bg-surface p-4 hover-lift"
    data-animate
  >
    <div className="text-3xl font-heading text-primary transition-all duration-300">
      {value}
    </div>
    <div className="text-xs uppercase tracking-[2px] text-text-muted">
      {label}
    </div>
  </div>
);
