import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { conversationsApi } from "@/api/conversations";
import { useAuthStore } from "@/store/auth";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

const suggestions = [
  "todo: renew my passport",
  "note: idea for the weekend project",
  "What have I got going on right now?",
];

function AssistantOrb({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-ink-950",
        className
      )}
    >
      <Sparkles className="size-4" />
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <AssistantOrb className="size-7" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-ink-800 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-slate-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: conversationsApi.list,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mockMode, setMockMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => conversationsApi.messages(activeId as string),
    enabled: !!activeId,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const createConversation = useMutation({
    mutationFn: () => conversationsApi.create(),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(conv.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) => conversationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(null);
      toast.success("Conversation deleted");
    },
  });

  const sendMessage = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      conversationsApi.send(conversationId, content),
    onSuccess: (res, variables) => {
      setMockMode(res.mock_mode);
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Message failed to send"),
  });

  async function submitMessage(content: string) {
    if (!content.trim()) return;
    let conversationId = activeId;
    if (!conversationId) {
      const conv = await conversationsApi.create();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(conv.id);
      conversationId = conv.id;
    }
    sendMessage.mutate({ conversationId, content: content.trim() });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft;
    setDraft("");
    submitMessage(content);
  }

  return (
    <div>
      <PageHeader
        title="Assistant"
        description="Ask anything, or drop a quick todo/note inline."
        action={
          <Button onClick={() => createConversation.mutate()} loading={createConversation.isPending}>
            <Plus className="size-4" /> New chat
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-11rem)] gap-6">
        <div className="w-64 shrink-0 space-y-2 overflow-y-auto pr-1">
          {conversations.length === 0 && (
            <EmptyState icon={MessageSquare} title="No conversations" description="Start a new chat above." />
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={clsx(
                "group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                activeId === c.id
                  ? "border-accent/40 bg-accent-soft"
                  : "border-ink-700 bg-ink-800/40 hover:border-ink-500"
              )}
            >
              <button onClick={() => setActiveId(c.id)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-200">
                {c.title}
              </button>
              <button
                onClick={() => deleteConversation.mutate(c.id)}
                className="shrink-0 text-slate-600 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          {mockMode && (
            <div className="border-b border-ink-800 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
              Running in mock mode — set OPENAI_API_KEY on the backend for real AI responses.
            </div>
          )}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length === 0 && !sendMessage.isPending && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <AssistantOrb className="mb-4 size-12" />
                <p className="font-display text-base font-medium text-white">Ask Omnia anything</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  I can see your notes, documents, and tasks — and can create new ones for you.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => submitMessage(s)}
                      className="rounded-full border border-ink-700 bg-ink-800/60 px-3 py-1.5 text-xs text-slate-300 hover:border-accent/40 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx("flex items-end gap-2", m.role === "user" && "flex-row-reverse")}
              >
                {m.role === "assistant" ? (
                  <AssistantOrb className="size-7" />
                ) : (
                  <Avatar name={user?.full_name || user?.email || "?"} className="size-7" />
                )}
                <div
                  className={clsx(
                    "max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-gradient-to-br from-accent to-accent-2 text-ink-950"
                      : "rounded-bl-sm bg-ink-800 text-slate-100"
                  )}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
            {sendMessage.isPending && <TypingBubble />}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-ink-800 p-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message Omnia..."
              className="flex-1 rounded-xl border border-ink-700 bg-ink-800/60 px-4 py-2.5 text-sm text-white outline-none focus:border-accent"
            />
            <Button type="submit" disabled={!draft.trim()} loading={sendMessage.isPending}>
              <Send className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
