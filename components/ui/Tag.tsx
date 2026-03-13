"use client";

type TagVariant = "exact" | "partial" | "none" | "neutral";

const variantClasses: Record<TagVariant, string> = {
  exact: "bg-green-700 text-white border-green-800",
  partial: "bg-amber-600 text-white border-amber-700",
  none: "bg-red-700 text-white border-red-800",
  neutral: "bg-gray-600 text-gray-200 border-gray-700",
};

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  symbol?: string;
  className?: string;
  title?: string;
}

export function Tag({
  children,
  variant = "neutral",
  symbol,
  className = "",
  title,
}: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-sm font-medium ${variantClasses[variant]} ${className}`}
      title={title}
    >
      {symbol && <span className="opacity-90">{symbol}</span>}
      {children}
    </span>
  );
}
