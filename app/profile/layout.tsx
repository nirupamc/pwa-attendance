import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro-Attendance — Profile",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
