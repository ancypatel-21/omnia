import { api } from "@/api/client";
import type { Task, TaskPriority, TaskStatus } from "@/types";

export const tasksApi = {
  list: async (): Promise<Task[]> => (await api.get<Task[]>("/tasks")).data,
  create: async (payload: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }): Promise<Task> => (await api.post<Task>("/tasks", payload)).data,
  update: async (id: string, payload: Partial<Omit<Task, "id" | "created_at" | "updated_at">>): Promise<Task> =>
    (await api.patch<Task>(`/tasks/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },
};
