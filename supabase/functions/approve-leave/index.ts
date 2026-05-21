import { createSupabaseAdmin, getUserFromRequest, requireAdmin } from "../_shared/supabase.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  try {
    const { user } = await getUserFromRequest(request);
    await requireAdmin(user.id);
    const { leaveId } = await request.json();
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status: "Approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", leaveId)
      .select("user_id, leave_type, start_date, end_date")
      .single();
    if (error || !data) return json({ error: "Unable to approve" }, 400);

    await supabase.functions.invoke("send-push-notification", {
      body: {
        userId: data.user_id,
        title: "Leave Approved ✓",
        body: `Your ${data.leave_type} leave for ${data.start_date} - ${data.end_date} was approved.`,
      },
    });

    return json({ success: true });
  } catch {
    return json({ error: "Unauthorized" }, 403);
  }
});
