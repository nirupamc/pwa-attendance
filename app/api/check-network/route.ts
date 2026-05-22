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
  const clientIP = getClientIP(request);

  if (!clientIP) {
    return NextResponse.json(
      { isOfficeNetwork: false, configured: false, currentIp: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
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

  if (error || !settings?.public_ip) {
    return NextResponse.json(
      { isOfficeNetwork: false, configured: false, currentIp: clientIP },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      isOfficeNetwork: clientIP === settings.public_ip,
      configured: true,
      currentIp: clientIP,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
