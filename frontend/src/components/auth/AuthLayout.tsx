import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles, Brain, Search, Zap } from "lucide-react";

const features = [
  { icon: Brain, text: "Persistent memory across every note, doc, and chat" },
  { icon: Search, text: "Semantic search that finds what you meant, not just what you typed" },
  { icon: Zap, text: "AI agents that turn a message into a task or note automatically" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/5 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-40"
          style={{ maskImage: "radial-gradient(circle at 30% 20%, black, transparent 70%)" }}
        />
        <div className="pointer-events-none absolute -left-24 top-1/3 size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-10 size-72 rounded-full bg-accent-2/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex items-center gap-2.5"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_24px_-4px_rgba(139,107,255,0.7)]">
            <Sparkles className="size-5 text-ink-950" />
          </div>
          <span className="font-display text-xl font-semibold text-white">Omnia</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <h1 className="font-display text-4xl font-semibold leading-tight text-white">
            Your whole workspace,
            <br />
            <span className="gradient-text">remembered.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Notes, documents, tasks, and an AI assistant that actually knows your context —
            in one personal workspace.
          </p>

          <div className="mt-10 space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-accent ring-1 ring-white/10">
                  <f.icon className="size-4" />
                </div>
                <span className="text-sm text-slate-300">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative text-xs text-slate-600">Built with FastAPI, Postgres + pgvector, and React.</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">{children}</div>
    </div>
  );
}
