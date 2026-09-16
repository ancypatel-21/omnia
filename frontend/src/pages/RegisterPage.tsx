import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fetchMe, login, register } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setSession = useAuthStore((s) => s.setSession);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, fullName || undefined);
      const token = await login(email, password);
      setToken(token);
      const user = await fetchMe();
      setSession(token, user);
      toast.success("Workspace created. Welcome to Omnia!");
      navigate("/");
    } catch {
      toast.error("Could not create account. That email may already be registered.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        onSubmit={handleSubmit}
        className="glass-panel w-full max-w-sm rounded-2xl p-8"
      >
        <h1 className="font-display mb-1 text-xl font-semibold text-white">Create your workspace</h1>
        <p className="mb-6 text-sm text-slate-400">Set up Omnia in a few seconds.</p>

        <div className="space-y-4">
          <TextField
            label="Full name"
            icon={User}
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
          />
          <TextField
            label="Email"
            type="email"
            icon={Mail}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            type="password"
            icon={Lock}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <Button type="submit" loading={loading} className="mt-6 w-full">
          Create account
          {!loading && <ArrowRight className="size-4" />}
        </Button>

        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  );
}
