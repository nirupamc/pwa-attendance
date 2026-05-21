import webpush from "https://esm.sh/web-push@3.6.7";
import {
  createSupabaseAdmin,
  getUserFromRequest,
  requireAdmin,
} from "../_shared/supabase.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  try {
    const { user } = await getUserFromRequest(request);
    await requireAdmin(user.id);
    const { userId, title, body } = await request.json();
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();

    if (!data?.subscription) {
      return json({ error: "Subscription not found" }, 404);
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    webpush.setVapidDetails("mailto:admin@tantech.com", vapidPublic, vapidPrivate);

    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({
        title,
        body,
        icon: "/icons/icon-192x192.png",
      })
    );

    return json({ success: true });
  } catch {
    return json({ error: "Unable to send notification" }, 500);
  }
});
