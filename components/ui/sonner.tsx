"use client";

import { Toaster as Sonner } from "sonner";

export const Toaster = () => (
  <Sonner
    position="top-center"
    theme="dark"
    toastOptions={{
      classNames: {
        toast:
          "bg-surface border border-border text-text-primary shadow-none rounded-xl",
        description: "text-text-muted",
        actionButton:
          "bg-primary text-background hover:bg-primary-dark",
        cancelButton: "border border-border text-text-primary",
      },
    }}
  />
);
