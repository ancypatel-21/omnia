export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface ChatResponse {
  message: Message;
  used_memory: string[];
  mock_mode: boolean;
}

export interface SearchResult {
  id: string;
  source_type: "note" | "document" | "task" | "message" | "fact";
  source_id: string | null;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  took_ms: number;
  cache_hit: boolean;
}
