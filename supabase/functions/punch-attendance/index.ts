import {
  createSupabaseAdmin,
  getUserFromRequest,
  jsonResponse,
  corsHeaders,
  isOptionsRequest,
} from "../_shared/supabase.ts";

const getClientIP = (request: Request): string | null => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
};

Deno.serve(async (request) => {
  if (isOptionsRequest(request)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await getUserFromRequest(request);
    const { userId, type, qrToken } = await request.json();

    if (userId && userId !== user.id) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }
    if (!type || !qrToken) {
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const supabase = createSupabaseAdmin();
    const isDev = Deno.env.get("ENVIRONMENT") === "development";

    // ── TIME WINDOW CHECK (skip in dev) ──────────────────────────────
    if (!isDev) {
      const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
      const d = new Date(Date.now() + IST_OFFSET_MS);
      const totalMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
      const inWindow = totalMinutes >= 17 * 60 + 45 || totalMinutes <= 3 * 60 + 30;
      if (!inWindow) {
        return jsonResponse(
          {
            success: false,
            error:
              "Punching is only available from 5:45 PM to 3:30 AM. Please try again during shift hours.",
          },
          403,
        );
      }
    }
    // ── END TIME WINDOW CHECK ─────────────────────────────────────────

    const clientIP = getClientIP(request);

    if (!isDev) {
      if (!clientIP) {
        return jsonResponse(
          {
            success: false,
            error:
              "Could not determine your network location. Please try again.",
          },
          400,
        );
      }

      const { data: officeConfig } = await supabase
        .from("office_config")
        .select("public_ip, label")
        .eq("is_active", true)
        .maybeSingle();

      if (!officeConfig) {
        return jsonResponse(
          {
            success: false,
            error:
              "Office network not configured. Contact your administrator.",
          },
          403,
        );
      }

      if (clientIP !== officeConfig.public_ip) {
        return jsonResponse(
          {
            success: false,
            error:
              "You must be connected to the office WiFi to punch in or out.",
          },
          403,
        );
      }
    }

    const { data: qr } = await supabase
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", qrToken)
      .eq("is_active", true)
      .single();

    if (!qr) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid QR code. Please scan the correct office QR code.",
        },
        403,
      );
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        type,
        punched_at: new Date().toISOString(),
        ip_at_punch: clientIP,
        qr_verified: true,
      })
      .select("punched_at, type")
      .single();

    if (error) {
      return jsonResponse({ success: false, error: "Unable to punch" }, 500);
    }

    return jsonResponse({
      success: true,
      punchedAt: data?.punched_at,
      type: data?.type,
    });
  } catch (err) {
    return jsonResponse(
      { success: false, error: (err as Error)?.message ?? "Invalid request" },
      400,
    );
  }
});
