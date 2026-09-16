import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, FileText, MessageSquare, Search, Sparkles, StickyNote, Zap } from "lucide-react";
import { searchApi } from "@/api/search";
import type { SearchResponse, SearchResult } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

const sourceMeta: Record<SearchResult["source_type"], { icon: typeof StickyNote; color: string }> = {
  note: { icon: StickyNote, color: "text-amber-300 bg-amber-500/10" },
  document: { icon: FileText, color: "text-sky-300 bg-sky-500/10" },
  task: { icon: CheckSquare, color: "text-emerald-300 bg-emerald-500/10" },
  message: { icon: MessageSquare, color: "text-accent bg-accent-soft" },
  fact: { icon: Sparkles, color: "text-fuchsia-300 bg-fuchsia-500/10" },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchApi.query(query.trim());
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Semantic search"
        description="Searches across notes, documents, tasks, and past conversations via your persistent memory index."
      />

      <form onSubmit={handleSubmit} className="mb-6 max-w-2xl">
        <Card className="flex items-center gap-3 p-2 pl-4">
          <Search className="size-4 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <Button type="submit" loading={loading} size="sm">
            Search
          </Button>
        </Card>
      </form>

      {result && (
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <Zap className="size-3.5 text-accent" />
            {result.results.length} results in {result.took_ms.toFixed(1)}ms
            {result.cache_hit && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">cache hit</span>
            )}
          </div>

          {result.results.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description="Try a broader or different query." />
          ) : (
            <div className="space-y-2">
              {result.results.map((r, i) => {
                const meta = sourceMeta[r.source_type];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                          <Icon className="size-3" />
                          {r.source_type}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-ink-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                              style={{ width: `${Math.min(100, r.score * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{r.score.toFixed(3)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200">{r.content}</p>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
