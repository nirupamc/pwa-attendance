import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  evaluateDeviceTrust,
  userFacingDeviceBlockedMessage,
} from "@/lib/security/device-server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    const {
      userId,
      type,
      qrToken,
      deviceToken,
      fingerprintHash,
      fingerprintProfile,
      deviceName,
      deviceBrowser,
      devicePlatform,
      latitude,
      longitude,
      accuracy,
      locationCapturedAt,
    } = body as {
      userId?: string;
      type?: string;
      qrToken?: string;
      deviceToken?: string;
      fingerprintHash?: string;
      fingerprintProfile?: Record<string, unknown>;
      deviceName?: string;
      deviceBrowser?: string;
      devicePlatform?: string;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      locationCapturedAt?: string | null;
    };

    if (!userId || !type || !qrToken) return json({ error: "Invalid payload" }, 400);
    if (userId !== user.id) return json({ error: "Unauthorized" }, 403);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const isDev = process.env.NODE_ENV !== "production";
    const clientIP = getClientIP();
    const userAgent = headers().get("user-agent");

    const logEvent = async (
      eventType: string,
      message: string,
      details: Record<string, unknown> = {}
    ) => {
      await adminClient.from("device_security_events").insert({
        user_id: user.id,
        event_type: eventType,
        message,
        ip_address: clientIP,
        user_agent: userAgent,
        details,
      });
    };

    const { data: employee } = await adminClient
      .from("employees")
      .select(
        "device_token_hash, fingerprint_hash, fingerprint_profile, device_status, device_registered_at"
      )
      .eq("id", user.id)
      .single();

    if (!employee || !deviceToken || !fingerprintHash) {
      await logEvent("attendance_device_blocked", "Attendance blocked due to missing device data.");
      return json({ error: userFacingDeviceBlockedMessage() }, 403);
    }

    const trust = evaluateDeviceTrust({
      deviceStatus: employee.device_status,
      storedTokenHash: employee.device_token_hash,
      storedFingerprintHash: employee.fingerprint_hash,
      storedProfile: employee.fingerprint_profile,
      incomingToken: deviceToken,
      incomingFingerprintHash: fingerprintHash,
      incomingProfile: fingerprintProfile,
    });

    if (!trust.trusted) {
      await logEvent("attendance_device_mismatch", "Attendance blocked due to device mismatch.", {
        code: trust.code,
        driftScore: trust.driftScore,
      });
      return json({ error: userFacingDeviceBlockedMessage() }, 403);
    }

    await adminClient
      .from("employees")
      .update({
        last_device_seen_at: new Date().toISOString(),
        last_office_ip: clientIP,
        device_name: deviceName ?? null,
        device_browser: deviceBrowser ?? null,
        device_platform: devicePlatform ?? null,
        device_user_agent: userAgent,
        ...(trust.driftAccepted
          ? {
              fingerprint_hash: fingerprintHash,
              fingerprint_profile: trust.normalizedProfile,
            }
          : {}),
      })
      .eq("id", user.id);

    if (trust.driftAccepted) {
      await logEvent("fingerprint_drift_accepted", "Minor browser/device drift accepted.", {
        driftScore: trust.driftScore,
      });
    }

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
        .select("public_ip, label, office_latitude, office_longitude, allowed_radius_meters, geofence_enabled")
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

    // ── GEOFENCE — observe mode, never blocks attendance ──────────────
    const geofenceFields: Record<string, unknown> = {};
    {
      const { data: geoConfig } = await adminClient
        .from("office_config")
        .select("office_latitude, office_longitude, allowed_radius_meters, geofence_enabled")
        .eq("is_active", true)
        .maybeSingle();

      if (
        geoConfig?.geofence_enabled &&
        geoConfig.office_latitude != null &&
        geoConfig.office_longitude != null
      ) {
        if (latitude != null && longitude != null) {
          const dist = haversineMeters(
            geoConfig.office_latitude,
            geoConfig.office_longitude,
            latitude,
            longitude
          );
          const radius = geoConfig.allowed_radius_meters ?? 200;
          const effectiveDist = dist - (accuracy ?? 0);
          const passed = effectiveDist <= radius;
          Object.assign(geofenceFields, {
            punch_latitude: latitude,
            punch_longitude: longitude,
            location_accuracy: accuracy ?? null,
            geofence_distance_meters: Math.round(dist * 100) / 100,
            geofence_passed: passed,
            location_captured_at: locationCapturedAt ?? null,
            geofence_validation_mode: "observe",
            geofence_reason: passed ? "inside_radius" : "outside_radius",
          });
          console.info(
            `[geofence] dist=${Math.round(dist)}m effectiveDist=${Math.round(effectiveDist)}m radius=${radius}m passed=${passed}`
          );
        } else {
          Object.assign(geofenceFields, {
            geofence_validation_mode: "observe",
            geofence_reason: "location_denied",
          });
          console.info("[geofence] No coordinates received; reason=location_denied");
        }
      } else {
        Object.assign(geofenceFields, {
          geofence_validation_mode: "observe",
          geofence_reason: geoConfig ? "geofence_disabled" : "config_missing",
        });
      }
    }
    // ── END GEOFENCE ──────────────────────────────────────────────────

    const { data, error } = await adminClient
      .from("attendance")
      .insert({
        user_id: userId,
        type,
        punched_at: new Date().toISOString(),
        ip_at_punch: clientIP,
        qr_verified: true,
        ...geofenceFields,
      })
      .select("punched_at")
      .single();

    if (error) return json({ error: "Unable to punch" }, 500);

    return json({ success: true, punchedAt: data?.punched_at });
  } catch (err) {
    return json({ error: (err as Error)?.message ?? "Invalid request" }, 400);
  }
}
