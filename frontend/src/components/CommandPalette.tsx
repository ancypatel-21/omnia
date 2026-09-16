import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  StickyNote,
  CheckSquare,
  Plus,
} from "lucide-react";
import { notesApi } from "@/api/notes";
import { tasksApi } from "@/api/tasks";
import { documentsApi } from "@/api/documents";
import { useAuthStore } from "@/store/auth";
import { useCommandPaletteStore } from "@/store/commandPalette";

export default function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  function go(path: string) {
    navigate(path);
    setOpen(false);
  }

  async function quickCreateNote() {
    setOpen(false);
    await notesApi.create({ title: "Untitled note", content: "" });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Note created");
    navigate("/notes");
  }

  async function quickCreateTask() {
    setOpen(false);
    await tasksApi.create({ title: "New task" });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast.success("Task created");
    navigate("/tasks");
  }

  async function quickCreateDocument() {
    setOpen(false);
    await documentsApi.create({ title: "Untitled document", content: "" });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    toast.success("Document created");
    navigate("/documents");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl"
        loop
      >
        <div className="flex items-center gap-2 border-b border-ink-800 px-4">
          <Search className="size-4 text-slate-500" />
          <Command.Input
            autoFocus
            placeholder="Type a command or search..."
            className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <kbd className="rounded border border-ink-700 px-1.5 py-0.5 text-[10px] text-slate-500">esc</kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Quick create" className="px-2 py-1 text-xs text-slate-500">
            <Item icon={StickyNote} onSelect={quickCreateNote}>
              New note
            </Item>
            <Item icon={CheckSquare} onSelect={quickCreateTask}>
              New task
            </Item>
            <Item icon={FileText} onSelect={quickCreateDocument}>
              New document
            </Item>
          </Command.Group>

          <Command.Group heading="Navigate" className="px-2 py-1 text-xs text-slate-500">
            <Item icon={LayoutDashboard} onSelect={() => go("/")}>
              Dashboard
            </Item>
            <Item icon={MessageSquare} onSelect={() => go("/chat")}>
              Assistant
            </Item>
            <Item icon={StickyNote} onSelect={() => go("/notes")}>
              Notes
            </Item>
            <Item icon={FileText} onSelect={() => go("/documents")}>
              Documents
            </Item>
            <Item icon={CheckSquare} onSelect={() => go("/tasks")}>
              Tasks
            </Item>
            <Item icon={Search} onSelect={() => go("/search")}>
              Semantic search
            </Item>
          </Command.Group>

          <Command.Group heading="Account" className="px-2 py-1 text-xs text-slate-500">
            <Item icon={LogOut} onSelect={() => { setOpen(false); logout(); }}>
              Sign out
            </Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
}: {
  icon: typeof Plus;
  children: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-200 aria-selected:bg-white/8 aria-selected:text-white"
    >
      <Icon className="size-4 text-accent" />
      {children}
    </Command.Item>
  );
}
