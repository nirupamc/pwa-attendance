"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  employeeId: z.string().min(3, "Employee ID is required"),
  email: z.string().email("Enter a valid email"),
  tempPassword: z.string().min(8, "Temporary password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function CreateEmployeePage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      employeeId: "",
      email: "",
      tempPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.error) {
        setError(payload?.error ?? "Unable to create account.");
        setIsLoading(false);
        return;
      }
    } catch (err) {
      setError((err as Error)?.message ?? "Unable to create account.");
      setIsLoading(false);
      return;
    }
    toast.success("Employee created ✓");
    form.reset();
    setIsLoading(false);
  };

  return (
    <div className="max-w-xl rounded-xl border border-border bg-surface p-6">
      <h1 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
        Create Employee
      </h1>
      <p className="text-sm text-text-muted">
        Employee will be prompted to change this password on first login.
      </p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 space-y-4"
      >
        <Input placeholder="Full Name" {...form.register("fullName")} />
        {form.formState.errors.fullName && (
          <p className="text-xs text-danger">
            {form.formState.errors.fullName.message}
          </p>
        )}
        <Input placeholder="Employee ID" {...form.register("employeeId")} />
        {form.formState.errors.employeeId && (
          <p className="text-xs text-danger">
            {form.formState.errors.employeeId.message}
          </p>
        )}
        <Input placeholder="Email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-xs text-danger">
            {form.formState.errors.email.message}
          </p>
        )}
        <Input
          type="password"
          placeholder="Temporary Password"
          {...form.register("tempPassword")}
        />
        {form.formState.errors.tempPassword && (
          <p className="text-xs text-danger">
            {form.formState.errors.tempPassword.message}
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="submit"
          className="w-full bg-primary text-background hover:bg-primary-dark"
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Account"}
        </Button>
      </form>
    </div>
  );
}
