import clsx from "clsx";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
}

const ALERT_CONFIG = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-300",
    Icon: CheckCircle,
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-300",
    Icon: XCircle,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-300",
    Icon: AlertCircle,
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-300",
    Icon: Info,
  },
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  const config = ALERT_CONFIG[variant];
  const { Icon } = config;
  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-4 rounded-lg border",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
}
