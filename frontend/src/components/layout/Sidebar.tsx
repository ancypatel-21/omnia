import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  StickyNote,
  FileText,
  CheckSquare,
  Search,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCommandPaletteStore } from "@/store/commandPalette";
import Avatar from "@/components/ui/Avatar";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Assistant", icon: MessageSquare },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/search", label: "Search", icon: Search },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col justify-between border-r border-white/5 bg-ink-900/60 p-4 backdrop-blur-xl">
      <div>
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_20px_-2px_rgba(139,107,255,0.6)]">
            <Sparkles className="size-4 text-ink-950" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-white">Omnia</span>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="relative">
              {({ isActive }) => (
                <div
                  className={
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors " +
                    (isActive ? "text-white" : "text-slate-400 hover:text-slate-200")
                  }
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/10"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <link.icon className="relative z-10 size-4" />
                  <span className="relative z-10">{link.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => useCommandPaletteStore.getState().setOpen(true)}
          className="mt-6 flex w-full items-center justify-between rounded-xl border border-dashed border-ink-700 px-3 py-2.5 text-xs text-slate-500 transition-colors hover:border-ink-500 hover:text-slate-300"
        >
          <span>Jump anywhere...</span>
          <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-sans text-slate-300">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl bg-ink-800/70 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={user?.full_name || user?.email || "?"} className="size-8" />
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-200">{user?.full_name || "Welcome"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-rose-300"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
