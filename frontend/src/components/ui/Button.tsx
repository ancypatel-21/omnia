import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-accent to-accent-2 text-ink-950 font-semibold shadow-[0_8px_24px_-8px_rgba(139,107,255,0.6)] hover:brightness-110 active:brightness-95",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
  outline: "border border-ink-600 text-slate-200 hover:bg-white/5 hover:border-ink-500",
  danger: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20",
  subtle: "bg-ink-800 text-slate-200 hover:bg-ink-700 border border-ink-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export default Button;
