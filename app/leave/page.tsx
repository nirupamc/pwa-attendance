"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LeaveRequest, LeaveType } from "@/lib/types";
import { BottomNav } from "@/components/layout/BottomNav";
import { CachedBanner } from "@/components/layout/OfflineBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const leaveColors: Record<LeaveType, string> = {
  Sick: "bg-danger/20 text-danger",
  Casual: "bg-primary/20 text-primary",
  Paid: "bg-success/20 text-success",
};

export default function LeavePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [activeType, setActiveType] = useState<LeaveType>("Casual");
  const [activeTab, setActiveTab] = useState("requests");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const fetchRequests = async (uid: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRequests((data ?? []) as LeaveRequest[]);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setUserId(data.user.id);
        fetchRequests(data.user.id);
      }
    });
  }, []);

  const submitRequest = async () => {
    if (!userId || !startDate || !endDate) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("leave_requests").insert({
      user_id: userId,
      leave_type: activeType,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
      status: "Pending",
    });
    if (error) {
      toast.error("Unable to submit request.");
      return;
    }
    toast.success("Leave request submitted ✓");
    setReason("");
    setStartDate("");
    setEndDate("");
    fetchRequests(userId);
    setActiveTab("requests");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <CachedBanner />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-surface">
            <TabsTrigger value="requests" className="font-heading">
              My Requests
            </TabsTrigger>
            <TabsTrigger value="new" className="font-heading">
              New Request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6 space-y-4">
            {requests.length === 0 && (
              <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
                <div className="flex justify-center">
                  <Inbox className="text-primary" />
                </div>
                <p className="mt-2">No leave requests yet</p>
              </div>
            )}
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${leaveColors[request.leave_type]}`}
                  >
                    {request.leave_type}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      request.status === "Approved"
                        ? "bg-success/20 text-success"
                        : request.status === "Rejected"
                        ? "bg-danger/20 text-danger"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-text-primary">
                  {request.start_date} – {request.end_date}
                </p>
                {request.reason && (
                  <p className="mt-2 text-sm text-text-muted">
                    {request.reason}
                  </p>
                )}
                {request.status === "Rejected" && request.rejection_reason && (
                  <p className="mt-2 text-xs text-danger">
                    {request.rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="new" className="mt-6 space-y-4">
            <div className="flex gap-2">
              {(["Sick", "Casual", "Paid"] as LeaveType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex-1 rounded-full px-3 py-2 text-xs uppercase tracking-[2px] ${
                    activeType === type
                      ? "bg-primary text-background"
                      : "border border-border text-text-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            <Textarea
              placeholder="Reason (optional)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              className="w-full bg-primary text-background hover:bg-primary-dark"
              onClick={submitRequest}
            >
              Submit Request
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
