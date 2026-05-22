import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient({ mutableCookies: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await request.json();
    const { fullName, employeeId, email, tempPassword } = body;

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      return json({ error: createError?.message ?? "Unable to create user" }, 400);
    }

    const { error: insertError } = await adminClient.from("employees").insert({
      id: created.user.id,
      full_name: fullName,
      email,
      employee_id: employeeId,
      role: "employee",
      must_change_password: true,
    });

    if (insertError) {
      return json({ error: insertError.message ?? "Unable to save profile" }, 400);
    }

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
}
