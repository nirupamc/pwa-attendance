/**
 * One-time seed script. Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Run: node scripts/seed-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=").trim();
  }
  return env;
};

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  console.error(
    "Add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API → service_role (secret)"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN = {
  email: "admin@tantech-llc.com",
  password: "Admin@Tantech23",
  fullName: "TanTech Admin",
  employeeId: "ADMIN001",
  role: "admin",
  mustChangePassword: false,
};

const EMPLOYEES = [
  {
    email: "john.smith@tantech-llc.com",
    password: "Employee@123",
    fullName: "John Smith",
    employeeId: "EMP001",
  },
  {
    email: "sarah.jones@tantech-llc.com",
    password: "Employee@123",
    fullName: "Sarah Jones",
    employeeId: "EMP002",
  },
  {
    email: "mike.chen@tantech-llc.com",
    password: "Employee@123",
    fullName: "Mike Chen",
    employeeId: "EMP003",
  },
  {
    email: "lisa.patel@tantech-llc.com",
    password: "Employee@123",
    fullName: "Lisa Patel",
    employeeId: "EMP004",
  },
];

async function upsertUser({ email, password, fullName, employeeId, role, mustChangePassword }) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId = existing?.id;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Update auth ${email}: ${error.message}`);
    console.log(`  Updated auth user: ${email}`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new Error(`Create auth ${email}: ${error?.message ?? "unknown"}`);
    }
    userId = created.user.id;
    console.log(`  Created auth user: ${email}`);
  }

  const { error: profileError } = await supabase.from("employees").upsert(
    {
      id: userId,
      full_name: fullName,
      email,
      employee_id: employeeId,
      role,
      must_change_password: mustChangePassword,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`Upsert profile ${email}: ${profileError.message}`);
  }
  console.log(`  Upserted employees row: ${email} (${role})`);
}

async function main() {
  console.log("\nSeeding Pro-Attendance users...\n");

  console.log("Admin:");
  await upsertUser(ADMIN);

  console.log("\nDummy employees:");
  for (const emp of EMPLOYEES) {
    await upsertUser({
      ...emp,
      role: "employee",
      mustChangePassword: false,
    });
  }

  console.log("\nDone. Login credentials:\n");
  console.log("  ADMIN");
  console.log(`    Email:    ${ADMIN.email}`);
  console.log(`    Password: ${ADMIN.password}`);
  console.log("\n  EMPLOYEES (all use password: Employee@123)");
  for (const emp of EMPLOYEES) {
    console.log(`    ${emp.fullName.padEnd(12)} ${emp.email}  (${emp.employeeId})`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
