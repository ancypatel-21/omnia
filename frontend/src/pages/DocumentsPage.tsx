import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import clsx from "clsx";
import { documentsApi } from "@/api/documents";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: documentsApi.list,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");

  const selected = documents.find((d) => d.id === selectedId) || null;

  const filtered = useMemo(
    () =>
      documents.filter(
        (d) =>
          d.title.toLowerCase().includes(query.toLowerCase()) ||
          d.content.toLowerCase().includes(query.toLowerCase())
      ),
    [documents, query]
  );

  const createMutation = useMutation({
    mutationFn: () => documentsApi.create({ title: "Untitled document", content: "" }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedId(doc.id);
      setTitle(doc.title);
      setContent(doc.content);
      toast.success("Document created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; title: string; content: string }) =>
      documentsApi.update(payload.id, { title: payload.title, content: payload.content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedId(null);
      toast.success("Document deleted");
    },
  });

  function saveSelected() {
    if (!selected) return;
    if (selected.title === title && selected.content === content) return;
    updateMutation.mutate({ id: selected.id, title, content });
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description={`${documents.length} document${documents.length === 1 ? "" : "s"} indexed for retrieval`}
        action={
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
            <Plus className="size-4" /> New document
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
              placeholder="Filter documents..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}

            {!isLoading && filtered.length === 0 && (
              <EmptyState
                icon={FileText}
                title="No documents found"
                description={query ? "Try a different search." : "Add your first document to get started."}
              />
            )}

            {filtered.map((doc, i) => (
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => {
                  setSelectedId(doc.id);
                  setTitle(doc.title);
                  setContent(doc.content);
                }}
                className={clsx(
                  "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
                  selectedId === doc.id
                    ? "border-accent/40 bg-accent-soft"
                    : "border-ink-700 bg-ink-800/40 hover:border-ink-500 hover:bg-ink-800"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-100">{doc.title || "Untitled"}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">{wordCount(doc.content)}w</span>
                </div>
                {doc.content && <p className="mt-1 truncate text-xs text-slate-500">{doc.content}</p>}
              </motion.button>
            ))}
          </div>
        </div>

        <Card className="flex-1 p-6">
          {!selected ? (
            <EmptyState
              icon={FileText}
              title="Select a document"
              description="Choose a document from the list, or create a new one."
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
                  placeholder="Untitled document"
                />
                <button
                  onClick={() => deleteMutation.mutate(selected.id)}
                  title="Delete"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mb-4 text-xs text-slate-500">{wordCount(content)} words</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={saveSelected}
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600"
                placeholder="Paste or write document content..."
              />
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
