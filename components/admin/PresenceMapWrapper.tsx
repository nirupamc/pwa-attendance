"use client";

import dynamic from "next/dynamic";
import { Attendance, Employee } from "@/lib/types";

// Leaflet uses `window` — must be loaded client-side only
const PresenceMap = dynamic(
  () => import("./PresenceMap").then((m) => ({ default: m.PresenceMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] animate-pulse items-center justify-center rounded-lg border border-border bg-surface-2">
        <span className="text-sm text-text-muted">Loading map…</span>
      </div>
    ),
  },
);

interface PresenceMapWrapperProps {
  presentEmployees: Attendance[];
  employeeMap: Record<string, Employee>;
}

export function PresenceMapWrapper({
  presentEmployees,
  employeeMap,
}: PresenceMapWrapperProps) {
  return (
    <PresenceMap
      presentEmployees={presentEmployees}
      employeeMap={employeeMap}
    />
  );
}
