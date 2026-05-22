"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDeviceSecurityPayload } from "@/lib/security/device-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

    if (authError || !data.user) {
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("employees")
      .select("role, must_change_password")
      .eq("id", data.user.id)
      .single();

    if (profile?.must_change_password) {
      try {
        const payload = await getDeviceSecurityPayload();
        const res = await fetch("/api/device/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => null)) as
          | { trusted?: boolean; message?: string }
          | null;
        if (!res.ok || !data?.trusted) {
          localStorage.setItem("tt_device_trust", "blocked");
          localStorage.setItem(
            "tt_device_message",
            data?.message || "This account is registered on another trusted device."
          );
        } else {
          localStorage.setItem("tt_device_trust", "trusted");
          localStorage.removeItem("tt_device_message");
        }
      } catch {}
      router.replace("/change-password");
      return;
    }

    try {
      const payload = await getDeviceSecurityPayload();
      const res = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { trusted?: boolean; message?: string }
        | null;
      if (!res.ok || !data?.trusted) {
        localStorage.setItem("tt_device_trust", "blocked");
        localStorage.setItem(
          "tt_device_message",
          data?.message || "This account is registered on another trusted device."
        );
      } else {
        localStorage.setItem("tt_device_trust", "trusted");
        localStorage.removeItem("tt_device_message");
      }
    } catch {}

    router.replace(profile?.role === "admin" ? "/admin" : "/home");
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <div className="text-center">
          <h1 className="font-heading text-4xl uppercase tracking-[4px] text-primary">
            PRO-ATTENDANCE
          </h1>
          <p className="text-xs uppercase tracking-[3px] text-text-muted">
            BY TANTECH LLC
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-heading text-2xl uppercase tracking-[3px]">
            Welcome Back
          </h2>
          <p className="mt-1 text-sm text-text-muted">Sign in to continue</p>

          <form
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 flex flex-col gap-4"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-text-muted" />
              <Input
                type="email"
                placeholder="Email"
                className="pl-10"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-danger">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-text-muted" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="pl-10 pr-10"
                autoComplete="current-password"
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-text-muted"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-danger">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              type="submit"
              className="mt-2 w-full bg-primary text-background hover:bg-primary-dark"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            Account issues? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
