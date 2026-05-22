import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  evaluateDeviceTrust,
  getClientIpFromHeaders,
  userFacingDeviceBlockedMessage,
} from "@/lib/security/device-server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

type AttestBody = {
  deviceToken?: string;
  fingerprintHash?: string;
  fingerprintProfile?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ trusted: false, message: "Unauthorized" }, 401);

    const body = (await request.json()) as AttestBody;
    const { deviceToken, fingerprintHash, fingerprintProfile = {} } = body;

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const ip = getClientIpFromHeaders(request.headers);
    const userAgent = request.headers.get("user-agent");
    const nowIso = new Date().toISOString();

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

    const { data: employee, error } = await adminClient
      .from("employees")
      .select(
        "device_token_hash, fingerprint_hash, fingerprint_profile, device_status, last_device_seen_at"
      )
      .eq("id", user.id)
      .single();

    if (error || !employee) {
      return json({ trusted: false, message: "Unable to verify this account." }, 500);
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
      await logEvent("device_attest_failed", "Device attestation failed.", {
        code: trust.code,
        driftScore: trust.driftScore,
      });
      return json({ trusted: false, message: userFacingDeviceBlockedMessage() });
    }

    await adminClient
      .from("employees")
      .update({
        last_device_seen_at: nowIso,
        last_office_ip: ip,
        ...(trust.driftAccepted
          ? {
              fingerprint_hash: fingerprintHash ?? employee.fingerprint_hash,
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

    return json({ trusted: true, message: "Device verified." });
  } catch (err) {
    return json(
      { trusted: false, message: err instanceof Error ? err.message : "Invalid request" },
      400
    );
  }
}
