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

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await request.json();
    const { userId, type, qrToken } = body as {
      userId?: string;
      type?: string;
      qrToken?: string;
    };

    if (!userId || !type || !qrToken) return json({ error: "Invalid payload" }, 400);
    if (userId !== user.id) return json({ error: "Unauthorized" }, 403);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const isDev = process.env.NODE_ENV !== "production";
    const clientIP = getClientIP();

    // ── TIME WINDOW CHECK (skip in dev) ──────────────────────────────
    if (!isDev) {
      const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
      const d = new Date(Date.now() + IST_OFFSET_MS);
      const totalMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
      const inWindow = totalMinutes >= 17 * 60 + 45 || totalMinutes <= 3 * 60 + 30;
      if (!inWindow) {
        return json(
          { error: "Punching is only available from 5:45 PM to 3:30 AM. Please try again during shift hours." },
          403
        );
      }
    }
    // ── END TIME WINDOW CHECK ─────────────────────────────────────────

    if (!isDev) {
      if (!clientIP) {
        return json(
          { error: "Could not determine your network location. Please try again." },
          400
        );
      }

      const { data: officeConfig } = await adminClient
        .from("office_config")
        .select("public_ip, label")
        .eq("is_active", true)
        .maybeSingle();

      if (!officeConfig) {
        return json(
          { error: "Office network not configured. Contact your administrator." },
          403
        );
      }

      if (clientIP !== officeConfig.public_ip) {
        return json(
          { error: "You must be connected to the office WiFi to punch in or out." },
          403
        );
      }
    }

    const { data: qr } = await adminClient
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", qrToken)
      .eq("is_active", true)
      .single();

    if (!qr) {
      return json(
        { error: "Invalid QR code. Please scan the correct office QR code." },
        403
      );
    }

    const { data, error } = await adminClient
      .from("attendance")
      .insert({
        user_id: userId,
        type,
        punched_at: new Date().toISOString(),
        ip_at_punch: clientIP,
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
