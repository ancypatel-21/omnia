import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("omnia_token"),
  user: JSON.parse(localStorage.getItem("omnia_user") || "null"),
  setToken: (token) => {
    localStorage.setItem("omnia_token", token);
    set({ token });
  },
  setSession: (token, user) => {
    localStorage.setItem("omnia_token", token);
    localStorage.setItem("omnia_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("omnia_token");
    localStorage.removeItem("omnia_user");
    set({ token: null, user: null });
  },
}));
