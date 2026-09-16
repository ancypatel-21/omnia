import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Pin, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import clsx from "clsx";
import { notesApi } from "@/api/notes";
import type { Note } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({ queryKey: ["notes"], queryFn: notesApi.list });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");

  const selected = notes.find((n) => n.id === selectedId) || null;

  const filtered = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.content.toLowerCase().includes(query.toLowerCase())
      ),
    [notes, query]
  );

  const createMutation = useMutation({
    mutationFn: () => notesApi.create({ title: "Untitled note", content: "" }),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      selectNote(note);
      toast.success("Note created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; title: string; content: string }) =>
      notesApi.update(payload.id, { title: payload.title, content: payload.content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });

  const pinMutation = useMutation({
    mutationFn: (note: Note) => notesApi.update(note.id, { is_pinned: !note.is_pinned }),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success(note.is_pinned ? "Pinned" : "Unpinned");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setSelectedId(null);
      toast.success("Note deleted");
    },
  });

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  function saveSelected() {
    if (!selected) return;
    if (selected.title === title && selected.content === content) return;
    updateMutation.mutate({ id: selected.id, title, content });
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        description={`${notes.length} note${notes.length === 1 ? "" : "s"} in your workspace`}
        action={
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
            <Plus className="size-4" /> New note
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-11rem)] gap-6">
        <div className="flex w-80 shrink-0 flex-col">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-800/60 px-3 py-2">
            <Search className="size-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter notes..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}

            {!isLoading && filtered.length === 0 && (
              <EmptyState
                icon={StickyNote}
                title="No notes found"
                description={query ? "Try a different search." : "Create your first note to get started."}
              />
            )}

            {filtered.map((note, i) => (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => selectNote(note)}
                className={clsx(
                  "group relative w-full overflow-hidden rounded-xl border px-3.5 py-3 text-left transition-colors",
                  selectedId === note.id
                    ? "border-accent/40 bg-accent-soft"
                    : "border-ink-700 bg-ink-800/40 hover:border-ink-500 hover:bg-ink-800"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-slate-100">
                    {note.is_pinned && <Pin className="size-3 shrink-0 fill-accent text-accent" />}
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(note.updated_at)}</span>
                </div>
                {note.content && (
                  <p className="mt-1 truncate text-xs text-slate-500">{note.content}</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <Card className="flex-1 p-6">
          {!selected ? (
            <EmptyState
              icon={StickyNote}
              title="Select a note"
              description="Choose a note from the list, or create a new one."
            />
          ) : (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col"
            >
              <div className="mb-1 flex items-center gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveSelected}
                  className="font-display flex-1 bg-transparent text-xl font-semibold text-white outline-none"
                  placeholder="Untitled note"
                />
                <button
                  onClick={() => pinMutation.mutate(selected)}
                  title={selected.is_pinned ? "Unpin" : "Pin"}
                  className={clsx(
                    "flex size-8 items-center justify-center rounded-lg transition-colors",
                    selected.is_pinned
                      ? "text-accent hover:bg-accent-soft"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                  )}
                >
                  <Pin className={clsx("size-4", selected.is_pinned && "fill-accent")} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(selected.id)}
                  title="Delete"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mb-4 text-xs text-slate-500">Edited {timeAgo(selected.updated_at)}</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={saveSelected}
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
                placeholder="Start writing..."
              />
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
