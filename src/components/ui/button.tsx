import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-50 disabled:text-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "min-h-12 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        variantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});
