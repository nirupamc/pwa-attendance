"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Employee, LeaveRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type LeaveWithEmployee = LeaveRequest & { employee: Employee };

const filters = ["All", "Pending", "Reviewed"] as const;

export default function AdminLeavePage() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [requests, setRequests] = useState<LeaveWithEmployee[]>([]);
  const [selected, setSelected] = useState<LeaveWithEmployee | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = async (uid: string) => {
    const supabase = createSupabaseBrowserClient();
    const query = supabase
      .from("leave_requests")
      .select("*, employee:employees(*)")
      .neq("user_id", uid)
      .order("created_at", { ascending: false });

    const { data } = await query;
    setRequests((data ?? []) as LeaveWithEmployee[]);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.id) return;
      setAdminId(data.user.id);
      fetchRequests(data.user.id);
    });
  }, []);

  const filtered = requests.filter((request) => {
    if (filter === "Pending") return request.status === "Pending";
    if (filter === "Reviewed") return request.status !== "Pending";
    return true;
  });

  const approveLeave = async () => {
    if (!selected) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.functions.invoke("approve-leave", {
      body: { leaveId: selected.id },
    });
    if (error) {
      toast.error("Unable to approve leave.");
      return;
    }
    toast.success("Leave approved");
    setShowApprove(false);
    if (adminId) fetchRequests(adminId);
  };

  const rejectLeave = async () => {
    if (!selected) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.functions.invoke("reject-leave", {
      body: { leaveId: selected.id, rejectionReason: rejectionReason || null },
    });
    if (error) {
      toast.error("Unable to reject leave.");
      return;
    }
    toast.success("Leave rejected");
    setShowReject(false);
    setRejectionReason("");
    if (adminId) fetchRequests(adminId);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
        Leave Applications
      </h1>

      <div className="flex gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[2px] ${
              filter === item
                ? "bg-primary text-background"
                : "border border-border text-text-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
            No pending leave applications
          </div>
        )}
        {filtered.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary">
                  {request.employee?.full_name ?? "Employee"}
                </p>
                <p className="text-xs text-text-muted">
                  {request.employee?.employee_id ?? "EMP"}
                </p>
              </div>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
                {request.leave_type}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {request.start_date} – {request.end_date}
            </p>
            {request.reason && (
              <p className="mt-2 text-sm text-text-muted">{request.reason}</p>
            )}
            {request.status === "Pending" ? (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="border-success text-success"
                  onClick={() => {
                    setSelected(request);
                    setShowApprove(true);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-danger text-danger"
                  onClick={() => {
                    setSelected(request);
                    setShowReject(true);
                  }}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs ${
                  request.status === "Approved"
                    ? "bg-success/20 text-success"
                    : "bg-danger/20 text-danger"
                }`}
              >
                {request.status}
              </span>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Approve Leave?
          </DialogHeader>
          <p className="text-sm text-text-muted">
            Approve leave for {selected?.employee?.full_name}? This cannot be
            undone.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setShowApprove(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-success text-background hover:bg-success/90"
              onClick={approveLeave}
            >
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={showReject} onOpenChange={setShowReject}>
        <SheetContent side="bottom" className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Reject Leave Request
          </h3>
          <Textarea
            className="mt-4"
            placeholder="Reason for rejection (optional)"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setShowReject(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={rejectLeave}
            >
              Confirm Rejection
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
