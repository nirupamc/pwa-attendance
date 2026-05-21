import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await request.json();
    const { userId, type, qrToken, networkLabel } = body as {
      userId?: string;
      type?: string;
      qrToken?: string;
      networkLabel?: string | null;
    };

    if (!userId || !type || !qrToken) return json({ error: "Invalid payload" }, 400);
    if (userId !== user.id) return json({ error: "Unauthorized" }, 403);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    // verify QR
    const { data: qr } = await adminClient
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", qrToken)
      .eq("is_active", true)
      .single();

    if (!qr) return json({ error: "QR not valid" }, 403);

    const { data, error } = await adminClient
      .from("attendance")
      .insert({
        user_id: userId,
        type,
        punched_at: new Date().toISOString(),
        bssid_at_scan: null,
        network_label: networkLabel ?? null,
        qr_verified: true,
      })
      .select("punched_at")
      .single();

    if (error) return json({ error: "Unable to punch" }, 500);

    return json({ success: true, punchedAt: data?.punched_at });
  } catch (err) {
    return json({ error: (err as Error)?.message ?? "Invalid request" }, 400);
  }
}
