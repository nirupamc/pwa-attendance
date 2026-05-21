import { createSupabaseAdmin, getUserFromRequest, requireAdmin } from "../_shared/supabase.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  try {
    const { user } = await getUserFromRequest(request);
    await requireAdmin(user.id);
    const { fullName, employeeId, email, tempPassword } = await request.json();
    const supabase = createSupabaseAdmin();

    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (createError || !created.user) {
      return json({ error: "Unable to create user" }, 400);
    }

    const { error: insertError } = await supabase.from("employees").insert({
      id: created.user.id,
      full_name: fullName,
      email,
      employee_id: employeeId,
      role: "employee",
      must_change_password: true,
    });

    if (insertError) {
      return json({ error: "Unable to save profile" }, 400);
    }

    return json({ success: true });
  } catch {
    return json({ error: "Unauthorized" }, 403);
  }
});
