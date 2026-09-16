import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  StickyNote,
  FileText,
  CheckSquare,
  Pin,
  ArrowRight,
  Plus,
  Sparkles,
  ListTodo,
} from "lucide-react";
import { notesApi } from "@/api/notes";
import { documentsApi } from "@/api/documents";
import { tasksApi } from "@/api/tasks";
import { useAuthStore } from "@/store/auth";
import type { Note, Task } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const priorityDot: Record<string, string> = {
  low: "bg-slate-500",
  medium: "bg-amber-400",
  high: "bg-rose-400",
};

function StatCard({
  label,
  value,
  to,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  to: string;
  icon: typeof StickyNote;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Link to={to} className="group block">
        <Card className="gradient-ring relative overflow-hidden p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-accent/10 blur-2xl transition-opacity group-hover:opacity-150" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="font-display text-3xl font-semibold text-white">{value}</div>
              <div className="mt-1 text-sm text-slate-400">{label}</div>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/5 text-accent ring-1 ring-white/10">
              <Icon className="size-4" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [capture, setCapture] = useState("");

  const notes = useQuery({ queryKey: ["notes"], queryFn: notesApi.list });
  const documents = useQuery({ queryKey: ["documents"], queryFn: documentsApi.list });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: tasksApi.list });

  const captureMutation = useMutation<Note | Task, Error, string>({
    mutationFn: (title: string) => {
      const isTask = /^(todo|task)[:\-]/i.test(title);
      const clean = title.replace(/^(todo|task)[:\-]\s*/i, "");
      return isTask ? tasksApi.create({ title: clean }) : notesApi.create({ title: clean, content: "" });
    },
    onSuccess: (_, title) => {
      const isTask = /^(todo|task)[:\-]/i.test(title);
      queryClient.invalidateQueries({ queryKey: isTask ? ["tasks"] : ["notes"] });
      toast.success(isTask ? "Task added" : "Note captured");
      setCapture("");
    },
  });

  function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!capture.trim()) return;
    captureMutation.mutate(capture.trim());
  }

  const isLoading = notes.isLoading || documents.isLoading || tasks.isLoading;
  const openTasks = (tasks.data || []).filter((t) => t.status !== "done");
  const pinnedNotes = (notes.data || []).filter((n) => n.is_pinned);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">
          {greeting()}
          {user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-slate-400">Here's what's going on in your workspace.</p>
      </motion.div>

      <motion.form
        onSubmit={handleCapture}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <Card className="flex items-center gap-3 p-2 pl-4">
          <Sparkles className="size-4 shrink-0 text-accent" />
          <input
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder='Quick capture... try "todo: renew passport" or just jot a thought'
            className="w-full bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <Button type="submit" size="sm" loading={captureMutation.isPending}>
            <Plus className="size-3.5" /> Add
          </Button>
        </Card>
      </motion.form>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Notes" value={notes.data?.length ?? 0} to="/notes" icon={StickyNote} delay={0.1} />
          <StatCard
            label="Documents"
            value={documents.data?.length ?? 0}
            to="/documents"
            icon={FileText}
            delay={0.15}
          />
          <StatCard label="Open tasks" value={openTasks.length} to="/tasks" icon={CheckSquare} delay={0.2} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Pin className="size-3.5 text-accent" /> Pinned notes
              </h2>
              <Link to="/notes" className="flex items-center gap-1 text-xs text-slate-500 hover:text-accent">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            {pinnedNotes.length === 0 ? (
              <EmptyState icon={Pin} title="Nothing pinned yet" description="Pin a note to keep it front and center." />
            ) : (
              <ul className="space-y-2">
                {pinnedNotes.slice(0, 5).map((n) => (
                  <li
                    key={n.id}
                    className="truncate rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-200"
                  >
                    {n.title}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <ListTodo className="size-3.5 text-accent" /> Up next
              </h2>
              <Link to="/tasks" className="flex items-center gap-1 text-xs text-slate-500 hover:text-accent">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            {openTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="All caught up" description="No open tasks right now." />
            ) : (
              <ul className="space-y-2">
                {openTasks.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-slate-200"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className={`size-1.5 shrink-0 rounded-full ${priorityDot[t.priority]}`} />
                      <span className="truncate">{t.title}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
