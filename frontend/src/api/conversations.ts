import { api } from "@/api/client";
import type { ChatResponse, Conversation, Message } from "@/types";

export const conversationsApi = {
  list: async (): Promise<Conversation[]> => (await api.get<Conversation[]>("/conversations")).data,
  create: async (title?: string): Promise<Conversation> =>
    (await api.post<Conversation>("/conversations", { title: title || "New conversation" })).data,
  messages: async (conversationId: string): Promise<Message[]> =>
    (await api.get<Message[]>(`/conversations/${conversationId}/messages`)).data,
  send: async (conversationId: string, content: string): Promise<ChatResponse> =>
    (await api.post<ChatResponse>(`/conversations/${conversationId}/messages`, { content })).data,
  remove: async (conversationId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`);
  },
};
