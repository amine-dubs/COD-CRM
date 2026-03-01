import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={clsx(
          "w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
          error
            ? "border-red-500"
            : "border-gray-300 dark:border-gray-600"
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
