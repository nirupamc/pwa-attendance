import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  try {
    const { user } = await getUserFromRequest(request);
    const { userId, type, qrToken, networkLabel } = await request.json();

    if (userId !== user.id) {
      return json({ error: "Unauthorized" }, 403);
    }

    const supabase = createSupabaseAdmin();
    const { data: qr } = await supabase
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", qrToken)
      .eq("is_active", true)
      .single();

    if (!qr) {
      return json({ error: "QR not valid" }, 403);
    }

    const { data, error } = await supabase.from("attendance").insert({
      user_id: userId,
      type,
      punched_at: new Date().toISOString(),
      bssid_at_scan: null,
      network_label: networkLabel ?? null,
      qr_verified: true,
    }).select("punched_at").single();

    if (error) {
      return json({ error: "Unable to punch" }, 500);
    }

    return json({ success: true, punchedAt: data?.punched_at });
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
