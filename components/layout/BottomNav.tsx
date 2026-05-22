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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md">
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
                size={20}
                className={[
                  "transition-all duration-200",
                  active
                    ? "text-primary scale-110"
                    : "text-text-muted hover:text-text-primary",
                ].join(" ")}
              />
              {active && (
                <span className="uppercase tracking-[1px] text-primary animate-fade-in">
                  {item.label}
                </span>
              )}
              <span
                className={[
                  "mt-0.5 h-0.5 rounded-full bg-primary",
                  "transition-all duration-300 ease-out",
                  active ? "w-6 opacity-100 animate-nav-dot" : "w-0 opacity-0",
                ].join(" ")}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
