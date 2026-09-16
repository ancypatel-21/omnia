import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckSquare, GripVertical, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { tasksApi } from "@/api/tasks";
import type { Task, TaskStatus } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const columns: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "todo", label: "To do", accent: "bg-slate-500" },
  { status: "in_progress", label: "In progress", accent: "bg-accent" },
  { status: "done", label: "Done", accent: "bg-emerald-400" },
];

const priorityStyle: Record<Task["priority"], string> = {
  low: "bg-ink-700 text-slate-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-rose-500/15 text-rose-300",
};

function TaskCard({ task, dragging = false }: { task: Task; dragging?: boolean }) {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.remove(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging && !dragging ? 0.3 : 1,
      }}
      className={clsx(
        "group rounded-xl border border-ink-700 bg-ink-800/70 p-3 transition-colors",
        dragging ? "rotate-2 shadow-2xl ring-1 ring-accent/40" : "hover:border-ink-500"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 cursor-grab touch-none text-slate-600 hover:text-slate-400 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
          <span className="text-sm text-slate-100">{task.title}</span>
        </div>
        <button
          onClick={() => deleteMutation.mutate()}
          className="shrink-0 text-slate-600 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <span className={clsx("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", priorityStyle[task.priority])}>
        {task.priority}
      </span>
    </div>
  );
}

function Column({
  status,
  label,
  accent,
  tasks,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex flex-col rounded-2xl border p-4 transition-colors",
        isOver ? "border-accent/50 bg-accent-soft" : "border-ink-800 bg-ink-900/50"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={clsx("size-2 rounded-full", accent)} />
        <h2 className="text-sm font-medium text-slate-300">{label}</h2>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-700 px-3 py-6 text-center text-xs text-slate-600">
            Drop tasks here
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ["tasks"], queryFn: tasksApi.list });
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const createMutation = useMutation({
    mutationFn: (title: string) => tasksApi.create({ title }),
    onSuccess: () => {
      invalidate();
      toast.success("Task added");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.update(id, { status }),
    onSuccess: invalidate,
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate(newTitle.trim());
    setNewTitle("");
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    const newStatus = over.id as TaskStatus;
    if (task && task.status !== newStatus) {
      statusMutation.mutate({ id: task.id, status: newStatus });
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Drag cards between columns, or add a new one below."
      />

      <form onSubmit={handleCreate} className="mb-6">
        <Card className="flex items-center gap-2 p-2 pl-4">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task..."
            className="w-full bg-transparent py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <Button type="submit" size="sm" loading={createMutation.isPending}>
            <Plus className="size-3.5" /> Add
          </Button>
        </Card>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Add your first task above to get started." />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {columns.map((col, i) => (
              <motion.div
                key={col.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Column
                  status={col.status}
                  label={col.label}
                  accent={col.accent}
                  tasks={tasks.filter((t) => t.status === col.status)}
                />
              </motion.div>
            ))}
          </div>
          <DragOverlay>{activeTask && <TaskCard task={activeTask} dragging />}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
