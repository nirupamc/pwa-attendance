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
    const { targetUserId, newTempPassword } = await request.json();
    const supabase = createSupabaseAdmin();

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { password: newTempPassword }
    );
    if (updateError) {
      return json({ error: "Unable to reset password" }, 400);
    }

    await supabase
      .from("employees")
      .update({ must_change_password: true })
      .eq("id", targetUserId);

    return json({ success: true });
  } catch {
    return json({ error: "Unauthorized" }, 403);
  }
});
