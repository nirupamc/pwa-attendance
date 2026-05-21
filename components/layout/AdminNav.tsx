"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  CalendarCheck2,
  Wifi,
  QrCode,
  Home,
  Umbrella,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, mobileIcon: Home },
  { href: "/admin/employees", label: "Employees", icon: Users, mobileIcon: Users },
  { href: "/admin/leave", label: "Leave Inbox", icon: CalendarCheck2, mobileIcon: Umbrella },
  { href: "/admin/networks", label: "Networks", icon: Wifi, mobileIcon: Wifi },
  { href: "/admin/qr", label: "QR Code", icon: QrCode, mobileIcon: QrCode },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const AdminNav = () => {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="mb-6">
          <h2 className="font-heading text-2xl uppercase tracking-[3px] text-primary">
            Admin
          </h2>
          <p className="text-xs text-text-muted">TanTech LLC</p>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "border border-primary text-primary"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface md:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.mobileIcon;
            const mobileLabel =
              item.href === "/admin"
                ? "Dashboard"
                : item.href === "/admin/employees"
                ? "Employees"
                : item.href === "/admin/leave"
                ? "Leave"
                : item.href === "/admin/networks"
                ? "Networks"
                : "QR Code";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 text-xs"
              >
                <Icon
                  className={active ? "text-primary" : "text-text-muted"}
                  size={20}
                />
                {active && (
                  <span className="uppercase tracking-[1px] text-primary">
                    {mobileLabel}
                  </span>
                )}
                {active && (
                  <span className="mt-1 h-0.5 w-6 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
