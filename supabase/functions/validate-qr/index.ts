import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  try {
    await getUserFromRequest(request);
    const { secretToken } = await request.json();
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("office_qr_codes")
      .select("id")
      .eq("secret_token", secretToken)
      .eq("is_active", true)
      .single();
    return json({ valid: Boolean(data) });
  } catch {
    return json({ valid: false }, 400);
  }
});
