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

    if (!user) return json({ valid: false }, 401);

    const body = await request.json();
    const { secretToken } = body as { secretToken?: string };
    if (!secretToken) return json({ valid: false }, 400);

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { data } = await adminClient
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", secretToken)
      .eq("is_active", true)
      .single();

    return json({ valid: Boolean(data) });
  } catch (err) {
    return json({ valid: false, error: (err as Error)?.message ?? "" }, 500);
  }
}
