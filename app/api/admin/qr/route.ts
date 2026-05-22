import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export async function POST() {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { error: deactivateError } = await adminClient
      .from("office_qr_codes")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      return json({ error: "Unable to deactivate the current QR code" }, 500);
    }

    const token = crypto.randomUUID();
    const { data, error } = await adminClient
      .from("office_qr_codes")
      .insert({
        secret_token: token,
        is_active: true,
        generated_by: user.id,
      })
      .select("secret_token")
      .single();

    if (error) {
      return json({ error: "Unable to generate QR code" }, 500);
    }

    return json({ secretToken: data?.secret_token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
}