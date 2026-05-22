import type { Metadata } from "next";
import { ReactNode } from "react";
import { AdminNav } from "@/components/layout/AdminNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

export const metadata: Metadata = {
  title: "TanTrack — Admin Dashboard",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <OfflineBanner />
      <div className="flex">
        <AdminNav />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

