"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance, Employee, LeaveRequest } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
    for (let day = start; day <= end; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
      list.push(new Date(day));
    }
    return list;
  }, [currentMonth]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h1 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
          {employee?.full_name ?? "Employee"}
        </h1>
        <p className="text-sm text-text-muted">{employee?.email}</p>
        <p className="text-sm text-text-muted">{employee?.employee_id}</p>
        <span className="mt-2 inline-flex rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
          {employee?.role ?? "employee"}
        </span>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-primary text-primary"
            onClick={() => setShowResetPassword(true)}
          >
            Reset Password
          </Button>
          <Button
            variant="outline"
            className="border-warning text-warning"
            onClick={async () => {
              const supabase = createSupabaseBrowserClient();
              await supabase
                .from("employees")
                .update({ registered_device_id: null })
                .eq("id", employeeId);
            }}
          >
            Reset Device
          </Button>
          <Button
            variant="outline"
            className="border-danger text-danger"
            onClick={() => setShowDelete(true)}
          >
            Delete Employee
          </Button>
        </div>
      </div>
      {todaySummary && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-text-muted">Today&apos;s Summary</p>
          <p className="mt-2 text-text-primary">
            Last punch: {todaySummary.lastPunch.type} at{" "}
            {new Date(todaySummary.lastPunch.punched_at).toLocaleTimeString(
              "en-US",
              { hour: "2-digit", minute: "2-digit" }
            )}
          </p>
          <p className="text-text-muted">
            Network: {todaySummary.networkLabel}
          </p>
          <p className="text-text-primary">
            Active duration: {Math.floor(todaySummary.totalSeconds / 3600)}h{" "}
            {Math.floor((todaySummary.totalSeconds % 3600) / 60)}m
          </p>
        </div>
      )}

      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-2 bg-surface">
          <TabsTrigger value="attendance" className="font-heading">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="font-heading">
            Leave History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-6">
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = day.toISOString().split("T")[0];
              const hasPunch = (grouped[key] ?? []).length > 0;
              return (
                <div
                  key={key}
                  className="flex h-10 flex-col items-center justify-center rounded-lg border border-border text-xs"
                >
                  {day.getDate()}
                  {hasPunch && <span className="mt-1 h-2 w-2 rounded-full bg-success" />}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-6 space-y-4">
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
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                  {request.leave_type}
                </span>
                <span className="text-xs text-text-muted">{request.status}</span>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                {request.start_date} – {request.end_date}
              </p>
              {request.reason && (
                <p className="mt-2 text-sm text-text-muted">{request.reason}</p>
              )}
              {request.rejection_reason && (
                <p className="mt-2 text-xs text-danger">
                  {request.rejection_reason}
                </p>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

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
