"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Attendance } from "@/lib/types";
import { CachedBanner } from "@/components/layout/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("punched_at", start.toISOString())
      .lte("punched_at", end.toISOString())
      .then(({ data }) => setAttendance((data ?? []) as Attendance[]));
  }, [userId, currentMonth]);

  const days = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const dayList: (Date | null)[] = [];
    for (let i = 0; i < start.getDay(); i += 1) {
      dayList.push(null);
    }
    for (let day = start; day <= end; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
      dayList.push(new Date(day));
    }
    return dayList;
  }, [currentMonth]);

  const grouped = useMemo(() => {
    return attendance.reduce((acc, row) => {
      const dateKey = row.punched_at.split("T")[0];
      acc[dateKey] = acc[dateKey] ? [...acc[dateKey], row] : [row];
      return acc;
    }, {} as Record<string, Attendance[]>);
  }, [attendance]);

  const dayDetails = useMemo(() => {
    if (!selectedDate) return null;
    const key = selectedDate.toISOString().split("T")[0];
    const records = (grouped[key] ?? []).sort(
      (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
    );
    let totalSeconds = 0;
    for (let i = 0; i < records.length; i += 2) {
      const inRow = records[i];
      const outRow = records[i + 1];
      if (inRow?.type === "IN" && outRow?.type === "OUT") {
        totalSeconds +=
          (new Date(outRow.punched_at).getTime() -
            new Date(inRow.punched_at).getTime()) /
          1000;
      }
    }
    return { records, totalSeconds };
  }, [selectedDate, grouped]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <CachedBanner />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
              )
            }
          >
            <ChevronLeft className="text-primary" />
          </button>
          <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
            {currentMonth.toLocaleString("en-US", { month: "long" }).toUpperCase()}{" "}
            {currentMonth.getFullYear()}
          </h1>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
              )
            }
          >
            <ChevronRight className="text-primary" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-text-muted">
          {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
            <div key={day} className="uppercase tracking-[2px]">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-12" />;
            }
            const key = day.toISOString().split("T")[0];
            const records = grouped[key] ?? [];
            const today = new Date().toDateString() === day.toDateString();
            const future = day > new Date();
            const firstIn = records.find((r) => r.type === "IN");
            const lateCutoff = new Date(day);
            lateCutoff.setHours(9, 30, 0, 0);
            const isLate =
              firstIn && new Date(firstIn.punched_at) > lateCutoff;
            const dotClass = records.length
              ? isLate
                ? "bg-warning"
                : "bg-success"
              : !future && !isWeekend(day)
              ? "bg-danger"
              : "";

            return (
              <button
                key={key}
                className={`flex h-12 flex-col items-center justify-center rounded-lg border border-border ${
                  today ? "border-primary" : "border-border"
                }`}
                onClick={() => setSelectedDate(day)}
              >
                <span className="text-sm">{day.getDate()}</span>
                {dotClass && <span className={`mt-1 h-2 w-2 rounded-full ${dotClass}`} />}
              </button>
            );
          })}
        </div>

        {dayDetails && selectedDate && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h2 className="font-heading text-xl uppercase tracking-[3px] text-primary">
              {selectedDate.toDateString()}
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              {dayDetails.records.length === 0 && (
                <p className="text-text-muted">No punches recorded.</p>
              )}
              {dayDetails.records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between"
                >
                  <span
                    className={
                      record.type === "IN" ? "text-success" : "text-danger"
                    }
                  >
                    {record.type === "IN" ? "Punch In ↑" : "Punch Out ↓"}
                  </span>
                  <span className="text-text-primary">
                    {new Date(record.punched_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-primary">
              Total Active: {Math.floor(dayDetails.totalSeconds / 3600)}h{" "}
              {Math.floor((dayDetails.totalSeconds % 3600) / 60)}m
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
