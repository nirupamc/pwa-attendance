"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Employee } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("employees").select("*");
    setEmployees((data ?? []) as Employee[]);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.full_name.toLowerCase().includes(term) ||
        emp.employee_id.toLowerCase().includes(term)
    );
  }, [employees, search]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const supabase = createSupabaseBrowserClient();
    await supabase.from("employees").delete().eq("id", toDelete.id);
    setToDelete(null);
    fetchEmployees();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl uppercase tracking-[4px] text-primary">
          Employees
        </h1>
        <Link href="/admin/employees/create">
          <Button className="bg-primary text-background hover:bg-primary-dark">
            <Plus size={18} className="mr-2" />
            Add
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
        <Input
          className="pl-9"
          placeholder="Search by name or employee ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((employee) => (
          <div
            key={employee.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <Link href={`/admin/employees/${employee.id}`} className="flex-1">
              <p className="text-text-primary">{employee.full_name}</p>
              <p className="text-xs text-text-muted">{employee.employee_id}</p>
            </Link>
            <span className="mr-4 rounded-full bg-primary/20 px-3 py-1 text-xs text-primary">
              {employee.role}
            </span>
            <button onClick={() => setToDelete(employee)}>
              <Trash2 className="text-danger" size={18} />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(toDelete)} onOpenChange={() => setToDelete(null)}>
        <DialogContent className="bg-surface border-border">
          <h3 className="font-heading text-xl uppercase tracking-[3px] text-primary">
            Delete Employee
          </h3>
          <p className="text-sm text-text-muted">
            This will permanently delete {toDelete?.full_name}.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="border-border text-text-primary"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
