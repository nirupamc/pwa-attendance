import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getClientIP(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return (
    cfIp ||
    forwarded?.split(",")[0]?.trim() ||
    realIp ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { ip: getClientIP(request) },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
