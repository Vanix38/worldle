"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "warning";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ocean-600 text-white hover:bg-ocean-500 focus-visible:ring-ocean-500 disabled:opacity-50 disabled:hover:bg-ocean-600",
  secondary:
    "bg-gray-600 text-white hover:bg-gray-500 focus-visible:ring-gray-400 disabled:opacity-50 disabled:hover:bg-gray-600",
  ghost:
    "bg-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white focus-visible:ring-gray-400",
  success:
    "bg-green-600 text-white hover:bg-green-500 focus-visible:ring-green-400 disabled:opacity-50 disabled:hover:bg-green-600",
  warning:
    "bg-amber-600/80 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[2.5rem] px-3 py-1.5 text-sm",
  md: "min-h-[2.75rem] px-4 py-2 text-sm",
  lg: "min-h-[3rem] px-5 py-3 text-base",
};

const animationClasses =
  "transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98] disabled:transform-none";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  noAnimation?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      children,
      className = "",
      noAnimation,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900";
    const animClasses = noAnimation || disabled ? "" : animationClasses;
    const allClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${animClasses} ${className}`;

    return (
      <button
        ref={ref}
        className={allClasses}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
