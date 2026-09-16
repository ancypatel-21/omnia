import { InputHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, icon: Icon, className, ...props }, ref) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-800/60 px-3 py-2.5 transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/40">
        {Icon && <Icon className="size-4 shrink-0 text-slate-500" />}
        <input
          ref={ref}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          {...props}
        />
      </div>
    </label>
  )
);
TextField.displayName = "TextField";

export default TextField;
