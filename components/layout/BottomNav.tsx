"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Plane, User } from "lucide-react";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/leave", label: "Leave", icon: Plane },
  { href: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
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
                  {item.label}
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
  );
};
