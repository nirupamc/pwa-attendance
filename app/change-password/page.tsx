"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/\d/, "Must include a number")
      .regex(/[^\w\s]/, "Must include a special character"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const getStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;
  return score;
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const strength = useMemo(
    () => getStrength(form.watch("newPassword") ?? ""),
    [form]
  );

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Unable to identify your account.");
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.currentPassword,
    });

    if (signInError) {
      setError("Current password is incorrect.");
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.newPassword,
    });

    if (updateError) {
      setError("Unable to update password. Please try again.");
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("employees")
      .update({ must_change_password: false })
      .eq("id", user.id)
      .select("role")
      .single();

    router.replace(profile?.role === "admin" ? "/admin" : "/home");
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Set your personal password to continue. You cannot access the app
          until this is complete.
        </div>

        <h2 className="font-heading text-2xl uppercase tracking-[3px]">
          Change Password
        </h2>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4"
        >
          <div>
            <Input
              type="password"
              placeholder="Current Password"
              {...form.register("currentPassword")}
            />
            {form.formState.errors.currentPassword && (
              <p className="mt-1 text-xs text-danger">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <Input
              type="password"
              placeholder="New Password"
              {...form.register("newPassword")}
            />
            <div className="mt-2 h-2 w-full rounded-full bg-surface-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  strength === 1
                    ? "w-1/3 bg-danger"
                    : strength === 2
                    ? "w-2/3 bg-warning"
                    : strength === 3
                    ? "w-full bg-success"
                    : "w-0"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Min 8 chars, 1 number, 1 special char
            </p>
            {form.formState.errors.newPassword && (
              <p className="mt-1 text-xs text-danger">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <Input
              type="password"
              placeholder="Confirm New Password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-primary text-background hover:bg-primary-dark"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
