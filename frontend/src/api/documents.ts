import { api } from "@/api/client";
import type { Document } from "@/types";

export const documentsApi = {
  list: async (): Promise<Document[]> => (await api.get<Document[]>("/documents")).data,
  create: async (payload: { title: string; content?: string; mime_type?: string }): Promise<Document> =>
    (await api.post<Document>("/documents", payload)).data,
  update: async (id: string, payload: Partial<Pick<Document, "title" | "content">>): Promise<Document> =>
    (await api.patch<Document>(`/documents/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
};
