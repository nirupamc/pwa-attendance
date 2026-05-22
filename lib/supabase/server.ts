import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerClientOptions = {
  mutableCookies?: boolean;
};

export const createSupabaseServerClient = ({
  mutableCookies = false,
}: SupabaseServerClientOptions = {}) => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          if (!mutableCookies) return;
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          if (!mutableCookies) return;
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
};
