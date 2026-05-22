"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtimePresence } from "@/lib/hooks/useRealtimePresence";
import { useStaggerIn } from "@/lib/hooks/useStaggerIn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance, Employee } from "@/lib/types";
import { StatCard } from "@/components/admin/StatCard";
import { PresenceMapWrapper } from "@/components/admin/PresenceMapWrapper";
import { formatTime, diffSeconds } from "@/lib/utils/time";

export default function AdminDashboardPage() {
  const { stats, presentEmployees } = useRealtimePresence();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [latePunches, setLatePunches] = useState<Attendance[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("employees")
      .select("id, full_name, employee_id")
      .then(({ data }) => setEmployees((data ?? []) as Employee[]));

    const fetchLate = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("type", "IN")
        .gte("punched_at", startOfDay.toISOString());
      const rows = (data ?? []) as Attendance[];
      const firstInByUser = new Map<string, Attendance>();
      rows.forEach((row) => {
        const existing = firstInByUser.get(row.user_id);
        if (!existing || new Date(row.punched_at) < new Date(existing.punched_at)) {
          firstInByUser.set(row.user_id, row);
        }
      });
      const lateCutoff = new Date();
      lateCutoff.setHours(9, 30, 0, 0);
      const lateList = Array.from(firstInByUser.values()).filter(
        (row) => new Date(row.punched_at) > lateCutoff
      );
      setLatePunches(lateList);
    };

    fetchLate();
  }, []);

  const employeeMap = useMemo(() => {
    return employees.reduce<Record<string, Employee>>((acc, employee) => {
      acc[employee.id] = employee;
      return acc;
    }, {});
  }, [employees]);

  const presentCards = presentEmployees.map((row) => {
    const employee = employeeMap[row.user_id];
    const since = formatTime(new Date(row.punched_at));
    const durationSeconds = diffSeconds(new Date(row.punched_at), new Date());
    const duration = `${Math.floor(durationSeconds / 3600)}h ${Math.floor(
      (durationSeconds % 3600) / 60
    )}m`;
    return { row, employee, since, duration };
  });

  const lateCards = latePunches.map((row) => {
    const employee = employeeMap[row.user_id];
    const arrived = formatTime(new Date(row.punched_at));
    const lateMinutes = Math.max(
      0,
      Math.round((new Date(row.punched_at).getTime() - new Date(new Date().setHours(9, 30, 0, 0)).getTime()) / 60000)
    );
    return { row, employee, arrived, lateMinutes };
  });

  const containerRef = useStaggerIn(0.05);

  return (
    <div ref={containerRef} className="space-y-6">
      <h1 data-animate className="font-heading text-3xl uppercase tracking-[4px] text-primary">
        Dashboard
      </h1>

      <div data-animate className="grid gap-4 md:grid-cols-3">
        <StatCard label="Currently IN" value={stats.currentlyIn} />
        <StatCard label="Late Today" value={stats.late} />
        <StatCard label="Absent Today" value={stats.absent} />
      </div>

      {/* ── Presence Map ──────────────────────────────────────── */}
      <div data-animate className="rounded-xl border border-border bg-surface p-4 hover-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Office Presence
          </h2>
          <span className="text-xs text-text-muted">
            {presentCards.length} employee{presentCards.length !== 1 ? "s" : ""} currently in
          </span>
        </div>
        <PresenceMapWrapper
          presentEmployees={presentEmployees}
          employeeMap={employeeMap}
        />
      </div>

      <div data-animate className="rounded-xl border border-border bg-surface p-4 hover-lift">
        <h2 className="font-heading text-xl uppercase tracking-[3px] text-primary">
          Currently IN
        </h2>
        <div className="mt-4 space-y-3">
          {presentCards.length === 0 && (
            <p className="text-sm text-text-muted">No one is currently in.</p>
          )}
          {presentCards.map(({ row, employee, since, duration }) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm"
            >
              <div>
                <p className="text-text-primary">
                  {employee?.full_name ?? row.user_id}
                </p>
                <p className="text-xs text-text-muted">
                  {employee?.employee_id ?? "EMP"}
                </p>
                <p className="text-xs text-success">IN since {since}</p>
              </div>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                {duration}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div data-animate className="rounded-xl border border-border bg-surface p-4 hover-lift">
        <h2 className="font-heading text-xl uppercase tracking-[3px] text-primary">
          Late Arrivals
        </h2>
        <div className="mt-4 space-y-3">
          {lateCards.length === 0 && (
            <p className="text-sm text-text-muted">No late arrivals today.</p>
          )}
          {lateCards.map(({ row, employee, arrived, lateMinutes }) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm"
            >
              <div>
                <p className="text-text-primary">
                  {employee?.full_name ?? row.user_id}
                </p>
                <p className="text-xs text-text-muted">
                  Arrived {arrived}
                </p>
              </div>
              <span className="rounded-full bg-warning/20 px-3 py-1 text-xs text-warning">
                {lateMinutes} min late
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
