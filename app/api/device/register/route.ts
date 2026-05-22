import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  evaluateDeviceTrust,
  getClientIpFromHeaders,
  hashDeviceToken,
  userFacingDeviceBlockedMessage,
} from "@/lib/security/device-server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

type RegisterBody = {
  deviceToken?: string;
  fingerprintHash?: string;
  fingerprintProfile?: Record<string, unknown>;
  deviceName?: string;
  deviceBrowser?: string;
  devicePlatform?: string;
  forceRebind?: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ trusted: false, message: "Unauthorized" }, 401);

    const body = (await request.json()) as RegisterBody;
    const {
      deviceToken,
      fingerprintHash,
      fingerprintProfile = {},
      deviceName,
      deviceBrowser,
      devicePlatform,
    } = body;

    if (!deviceToken || deviceToken.length < 16 || !fingerprintHash) {
      return json(
        { trusted: false, code: "invalid_payload", message: userFacingDeviceBlockedMessage() },
        400
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const ip = getClientIpFromHeaders(request.headers);
    const userAgent = request.headers.get("user-agent");

    const logEvent = async (
      eventType: string,
      message: string,
      details: Record<string, unknown> = {}
    ) => {
      await adminClient.from("device_security_events").insert({
        user_id: user.id,
        event_type: eventType,
        message,
        ip_address: ip,
        user_agent: userAgent,
        details,
      });
    };

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select(
        "device_token_hash, fingerprint_hash, fingerprint_profile, device_status, device_registered_at"
      )
      .eq("id", user.id)
      .single();

    if (employeeError || !employee) {
      return json({ trusted: false, message: "Unable to verify device." }, 500);
    }

    const nowIso = new Date().toISOString();
    const tokenHash = hashDeviceToken(deviceToken);
    const isPendingRebind = employee.device_status === "pending_rebind";
    const isNewDevice = !employee.device_token_hash || isPendingRebind;

    if (employee.device_status === "revoked") {
      await logEvent("device_register_blocked", "Device registration blocked (revoked).");
      return json(
        { trusted: false, code: "revoked", message: userFacingDeviceBlockedMessage() },
        403
      );
    }

    if (isPendingRebind && !body.forceRebind) {
      console.info("[device] pending_rebind detected; rebind required");
      return json(
        {
          trusted: false,
          code: "pending_rebind",
          message: userFacingDeviceBlockedMessage(),
          rebindRequired: true,
        },
        409
      );
    }

    if (isNewDevice) {
      const { error: updateError } = await adminClient
        .from("employees")
        .update({
          registered_device_id: tokenHash.slice(0, 16),
          device_token_hash: tokenHash,
          fingerprint_hash: fingerprintHash,
          fingerprint_profile: fingerprintProfile,
          device_registered_at: employee.device_registered_at ?? nowIso,
          last_device_seen_at: nowIso,
          last_office_ip: ip,
          device_status: "active",
          device_name: deviceName ?? null,
          device_browser: deviceBrowser ?? null,
          device_platform: devicePlatform ?? null,
          device_user_agent: userAgent,
          device_rotated_at: employee.device_status === "pending_rebind" ? nowIso : null,
        })
        .eq("id", user.id);

      if (updateError) {
        return json(
          { trusted: false, code: "register_failed", message: "Unable to register this device." },
          500
        );
      }

      await logEvent(
        isPendingRebind
          ? "device_reregistered"
          : "device_registered",
        "Trusted device registration completed."
      );

      console.info(
        `[device] ${isPendingRebind ? "rebind recovery" : "registration"} succeeded`
      );
      return json({
        trusted: true,
        code: isPendingRebind ? "pending_rebind_recovered" : "registered",
        message: "Device verified.",
        registered: true,
      });
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
      await logEvent("device_mismatch", "Device validation failed.", {
        code: trust.code,
        driftScore: trust.driftScore,
      });
      console.info(`[device] mismatch detected (${trust.code})`);
      return json(
        { trusted: false, code: trust.code, message: userFacingDeviceBlockedMessage() },
        403
      );
    }

    const { error: seenError } = await adminClient
      .from("employees")
      .update({
        last_device_seen_at: nowIso,
        last_office_ip: ip,
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

    if (seenError) {
      return json(
        { trusted: false, code: "update_failed", message: "Unable to verify this device." },
        500
      );
    }

    if (trust.driftAccepted) {
      await logEvent("fingerprint_drift_accepted", "Minor browser/device drift accepted.", {
        driftScore: trust.driftScore,
      });
    }

    return json({ trusted: true, code: "trusted", message: "Device verified.", registered: false });
  } catch (err) {
    return json(
      { trusted: false, message: err instanceof Error ? err.message : "Invalid request" },
      400
    );
  }
}
