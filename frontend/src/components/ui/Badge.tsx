import clsx from "clsx";

interface BadgeProps {
  variant?: "critical" | "high" | "medium" | "low" | "success" | "info" | "default";
  children: React.ReactNode;
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        BADGE_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
