import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const getClientIP = (): string | null => {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || null;
};

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    const employeeId = params.id;
    if (!employeeId) return json({ error: "Employee ID is required" }, 400);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const nowIso = new Date().toISOString();
    const resetPayload = {
      registered_device_id: null,
      device_token_hash: null,
      fingerprint_hash: null,
      fingerprint_profile: {},
      device_registered_at: null,
      last_device_seen_at: null,
      device_status: "pending_rebind",
      device_rotated_at: nowIso,
    };

    const { error: updateError } = await adminClient
      .from("employees")
      .update(resetPayload)
      .eq("id", employeeId);

    if (updateError) {
      return json({ error: updateError.message || "Unable to reset device" }, 500);
    }

    await adminClient.from("device_security_events").insert({
      user_id: employeeId,
      event_type: "admin_device_reset",
      message: "Trusted device reset by administrator.",
      ip_address: getClientIP(),
      user_agent: headers().get("user-agent"),
      details: { adminUserId: user.id },
    });

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Invalid request" }, 400);
  }
}
