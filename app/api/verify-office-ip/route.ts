import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClientIP(request: NextRequest): string | null {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return cfIp || forwarded?.split(",")[0]?.trim() || realIp || null;
}

export async function GET(request: NextRequest) {
  try {
    const currentIp = getClientIP(request);

    if (!currentIp) {
      return NextResponse.json(
        {
          isOfficeNetwork: false,
          configured: false,
          currentIp: null,
          reason: "Could not determine your IP address",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Use service role to bypass RLS — employees can't read office_config directly
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { data: settings, error } = await adminClient
      .from("office_config")
      .select("public_ip")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          isOfficeNetwork: false,
          configured: false,
          currentIp,
          reason: error.message,
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!settings?.public_ip) {
      return NextResponse.json(
        {
          isOfficeNetwork: false,
          configured: false,
          currentIp,
          reason: "No office network configured. Ask your admin to set up the office IP.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const isOfficeNetwork = currentIp === settings.public_ip;

    return NextResponse.json(
      {
        isOfficeNetwork,
        configured: true,
        currentIp,
        reason: isOfficeNetwork
          ? "IP matches office network"
          : "Your IP does not match the office network",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        isOfficeNetwork: false,
        configured: false,
        currentIp: null,
        reason: error instanceof Error ? error.message : "Verification error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

