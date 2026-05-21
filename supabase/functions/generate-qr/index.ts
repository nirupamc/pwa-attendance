import { createSupabaseAdmin, corsHeaders, getUserFromRequest, isOptionsRequest, jsonResponse, requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (isOptionsRequest(request)) {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await getUserFromRequest(request);
    await requireAdmin(user.id);
    const supabase = createSupabaseAdmin();
    const { error: deactivateError } = await supabase
      .from("office_qr_codes")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) {
      return jsonResponse({ error: "Unable to deactivate the current QR code" }, 500);
    }

    const token = crypto.randomUUID();
    const { data, error } = await supabase
      .from("office_qr_codes")
      .insert({
        secret_token: token,
        is_active: true,
        generated_by: user.id,
      })
      .select("secret_token")
      .single();
    if (error) {
      return jsonResponse({ error: "Unable to generate" }, 500);
    }
    return jsonResponse({ secretToken: data?.secret_token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Missing Authorization header" || message === "Invalid user" ? 401 : 403;
    return jsonResponse({ error: message }, status);
  }
});
