import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fetchMe, login } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
      const user = await fetchMe();
      setSession(token, user);
      toast.success(`Welcome back, ${user.full_name || user.email}`);
      navigate("/");
    } catch {
      toast.error("Incorrect email or password.");
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
        <h1 className="font-display mb-1 text-xl font-semibold text-white">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-400">Sign in to your Omnia workspace.</p>

        <div className="space-y-4">
          <TextField
            label="Email"
            type="email"
            icon={Mail}
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            type="password"
            icon={Lock}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" loading={loading} className="mt-6 w-full">
          Sign in
          {!loading && <ArrowRight className="size-4" />}
        </Button>

        <p className="mt-5 text-center text-sm text-slate-400">
          No account?{" "}
          <Link to="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  );
}
