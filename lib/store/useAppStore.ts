import { create } from "zustand";
import { Employee } from "@/lib/types";

interface AppState {
  user: Employee | null;
  setUser: (user: Employee | null) => void;
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isOnline: true,
  setIsOnline: (isOnline) => set({ isOnline }),
}));
