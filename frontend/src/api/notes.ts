import { api } from "@/api/client";
import type { Note } from "@/types";

export const notesApi = {
  list: async (): Promise<Note[]> => (await api.get<Note[]>("/notes")).data,
  create: async (payload: { title: string; content?: string; is_pinned?: boolean }): Promise<Note> =>
    (await api.post<Note>("/notes", payload)).data,
  update: async (id: string, payload: Partial<Pick<Note, "title" | "content" | "is_pinned">>): Promise<Note> =>
    (await api.patch<Note>(`/notes/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};
