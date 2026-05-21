"use client";

interface StatCardProps {
  label: string;
  value: number;
}

export const StatCard = ({ label, value }: StatCardProps) => (
  <div className="rounded-xl border border-border border-l-[3px] border-l-primary bg-surface p-4">
    <div className="text-3xl font-heading text-primary">{value}</div>
    <div className="text-xs uppercase tracking-[2px] text-text-muted">
      {label}
    </div>
  </div>
);
