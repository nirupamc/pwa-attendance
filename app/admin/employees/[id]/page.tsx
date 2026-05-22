"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, MapPin, Shield } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance, Employee, LeaveRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusColor: Record<string, string> = {
  active: "text-success bg-success/10 border-success/30",
  pending_rebind: "text-warning bg-warning/10 border-warning/30",
  revoked: "text-danger bg-danger/10 border-danger/30",
};

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"attendance" | "leave">("attendance");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newTempPassword, setNewTempPassword] = useState("");

  const todaySummary = useMemo(() => {
    const todayKey = new Date().toISOString().split("T")[0];
    const records = (attendance ?? []).filter((row) =>
      row.punched_at.startsWith(todayKey)
    );
    if (records.length === 0) return null;
    const sorted = [...records].sort(
      (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
    );
    const last = sorted[sorted.length - 1];
    let totalSeconds = 0;
    for (let i = 0; i < sorted.length; i += 2) {
      const inRow = sorted[i];
      const outRow = sorted[i + 1];
      if (inRow?.type === "IN" && outRow?.type === "OUT") {
        totalSeconds +=
          (new Date(outRow.punched_at).getTime() -
            new Date(inRow.punched_at).getTime()) /
          1000;
      }
    }
    return {
      lastPunch: last,
      networkLabel: last.network_label ?? "QR only",
      totalSeconds,
    };
  }, [attendance]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single()
      .then(({ data }) => setEmployee(data as Employee));
  }, [employeeId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", employeeId)
      .gte("punched_at", start.toISOString())
      .lte("punched_at", end.toISOString())
      .then(({ data }) => setAttendance((data ?? []) as Attendance[]));
  }, [employeeId, currentMonth]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", employeeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLeaveRequests((data ?? []) as LeaveRequest[]));
  }, [employeeId]);

  const grouped = useMemo(() => {
    return attendance.reduce((acc, row) => {
      const dateKey = row.punched_at.split("T")[0];
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], row] : [row];
      return acc;
    }, {} as Record<string, Attendance[]>);
  }, [attendance]);

  const days = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const list: Date[] = [];
    for (
      let day = start;
      day <= end;
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    ) {
      list.push(new Date(day));
    }
    return list;
  }, [currentMonth]);

  // Monday-based offset so calendar aligns to correct column
  const firstDayOffset = useMemo(() => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    return d === 0 ? 6 : d - 1;
  }, [currentMonth]);

  const deviceStatus = (employee?.device_status ?? "active") as string;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Employee Header ─────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-xl uppercase tracking-[3px] text-primary truncate">
              {employee?.full_name ?? "Employee"}
            </h1>
            <p className="mt-0.5 text-sm text-text-muted truncate">{employee?.email}</p>
            <p className="text-xs text-text-muted">{employee?.employee_id}</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
            {employee?.role ?? "employee"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            className="w-full border-primary text-primary"
            onClick={() => setShowResetPassword(true)}
          >
            Reset Password
          </Button>
          <Button
            variant="outline"
            className="w-full border-warning text-warning"
            onClick={async () => {
              await fetch(`/api/admin/employees/${employeeId}/reset-device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
              const supabase = createSupabaseBrowserClient();
              const { data } = await supabase
                .from("employees")
                .select("*")
                .eq("id", employeeId)
                .single();
              setEmployee(data as Employee);
            }}
          >
            Reset Device
          </Button>
          <Button
            variant="outline"
            className="w-full border-danger text-danger"
            onClick={() => setShowDelete(true)}
          >
            Delete Employee
          </Button>
        </div>
      </div>

      {/* ── Device Info ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-sm uppercase tracking-widest text-primary">
            Trusted Device
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <p className="text-text-muted">Status</p>
            <span
              className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 font-medium capitalize ${statusColor[deviceStatus] ?? "text-text-primary"}`}
            >
              {deviceStatus.replace("_", " ")}
            </span>
          </div>
          <div>
            <p className="text-text-muted">Last Seen</p>
            <p className="mt-0.5 font-medium text-text-primary">
              {employee?.last_device_seen_at
                ? new Date(employee.last_device_seen_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Browser</p>
            <p className="mt-0.5 font-medium text-text-primary truncate">
              {employee?.device_browser || "—"}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Platform</p>
            <p className="mt-0.5 font-medium text-text-primary truncate">
              {employee?.device_platform || "—"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-text-muted">Last Office IP</p>
            <p className="mt-0.5 font-mono font-medium text-text-primary">
              {employee?.last_office_ip || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Today's Summary ─────────────────────────── */}
      {todaySummary && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm uppercase tracking-widest text-primary">
              Today
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-text-muted">Last Punch</p>
              <p className="mt-1 font-medium text-text-primary">
                {todaySummary.lastPunch.type}
              </p>
              <p className="text-text-muted">
                {new Date(todaySummary.lastPunch.punched_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-text-muted">Duration</p>
              <p className="mt-1 font-medium text-text-primary">
                {Math.floor(todaySummary.totalSeconds / 3600)}h{" "}
                {Math.floor((todaySummary.totalSeconds % 3600) / 60)}m
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-text-muted">Network</p>
              <p className="mt-1 font-medium text-text-primary truncate">
                {todaySummary.networkLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Switcher (Row 1) ────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`rounded-xl border py-3 text-center font-heading text-sm uppercase tracking-widest transition-colors ${
            activeTab === "attendance"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text-primary"
          }`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab("leave")}
          className={`rounded-xl border py-3 text-center font-heading text-sm uppercase tracking-widest transition-colors ${
            activeTab === "leave"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-text-muted hover:border-primary/40 hover:text-text-primary"
          }`}
        >
          Leave History
        </button>
      </div>

      {/* ── Tab Content (Row 2) ─────────────────────── */}
      {activeTab === "attendance" && (
        <div className="rounded-xl border border-border bg-surface p-4">
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => {
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                );
                setSelectedDay(null);
              }}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-heading text-sm uppercase tracking-widest text-primary">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={() => {
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                );
                setSelectedDay(null);
              }}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[10px] font-medium uppercase text-text-muted"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const key = day.toISOString().split("T")[0];
              const hasPunch = (grouped[key] ?? []).length > 0;
              const isToday = key === new Date().toISOString().split("T")[0];
              const isSelected = key === selectedDay;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-background font-semibold"
                      : isToday
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : hasPunch
                          ? "border-success/40 bg-success/10 text-text-primary"
                          : "border-border text-text-muted"
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {hasPunch && !isSelected && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-success" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded border border-success/40 bg-success/10" />
              Punch recorded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded border border-primary bg-primary/10" />
              Today
            </span>
          </div>

          {/* ── Day detail panel ──────────────────────── */}
          {selectedDay && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
              <p className="mb-3 font-heading text-xs uppercase tracking-widest text-primary">
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {(grouped[selectedDay] ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">No punches recorded.</p>
              ) : (
                <div className="space-y-2">
                  {[...(grouped[selectedDay] ?? [])]
                    .sort(
                      (a, b) =>
                        new Date(a.punched_at).getTime() -
                        new Date(b.punched_at).getTime()
                    )
                    .map((record, idx) => (
                      <div
                        key={record.id ?? idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            record.type === "IN"
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {record.type}
                        </span>
                        <span className="font-mono text-text-primary">
                          {new Date(record.punched_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className="text-xs text-text-muted">
                          {(record as any).network_label ?? "QR only"}
                        </span>
                        {record.geofence_distance_meters != null ? (
                          <span
                            className={`flex items-center gap-0.5 text-xs font-medium ${
                              record.geofence_passed
                                ? "text-success"
                                : "text-warning"
                            }`}
                          >
                            <MapPin size={10} />
                            {Math.round(record.geofence_distance_meters)}m
                          </span>
                        ) : record.geofence_reason &&
                          record.geofence_reason !== "geofence_disabled" &&
                          record.geofence_reason !== "config_missing" ? (
                          <span className="flex items-center gap-0.5 text-xs text-text-muted">
                            <MapPin size={10} />
                            {record.geofence_reason.replace(/_/g, " ")}
                          </span>
                        ) : null}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "leave" && (
        <div className="space-y-3">
          {leaveRequests.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
              No leave history.
            </div>
          )}
          {leaveRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                  {request.leave_type}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    request.status === "Approved"
                      ? "bg-success/10 text-success"
                      : request.status === "Rejected"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  {request.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {request.start_date} – {request.end_date}
              </p>
              {request.reason && (
                <p className="mt-2 text-sm text-text-muted">{request.reason}</p>
              )}
              {request.rejection_reason && (
                <p className="mt-2 text-xs text-danger">{request.rejection_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Reset Password
          </h3>
          <Input
            type="password"
            placeholder="New temporary password"
            value={newTempPassword}
            onChange={(event) => setNewTempPassword(event.target.value)}
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setShowResetPassword(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-background hover:bg-primary-dark"
              onClick={async () => {
                const supabase = createSupabaseBrowserClient();
                await supabase.functions.invoke("reset-password", {
                  body: { targetUserId: employeeId, newTempPassword },
                });
                setNewTempPassword("");
                setShowResetPassword(false);
              }}
            >
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Delete Employee
          </h3>
          <p className="text-sm text-text-muted">
            This will permanently delete {employee?.full_name}.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setShowDelete(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={async () => {
                const supabase = createSupabaseBrowserClient();
                await supabase.from("employees").delete().eq("id", employeeId);
                window.location.href = "/admin/employees";
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
