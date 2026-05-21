import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export const isOptionsRequest = (request: Request) => request.method === "OPTIONS";

export const createSupabaseAdmin = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

export const createSupabaseUserClient = (authHeader: string) =>
  createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

export const getUserFromRequest = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");
  const supabase = createSupabaseUserClient(authHeader);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Invalid user");
  return { user, authHeader };
};

export const requireAdmin = async (userId: string) => {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("employees")
    .select("role")
    .eq("id", userId)
    .single();
  if (!data || data.role !== "admin") {
    throw new Error("Admin access required");
  }
};
