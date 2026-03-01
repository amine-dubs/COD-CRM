"use client";

import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".csv",
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      onFileSelect(f);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const clear = () => setFile(null);

  if (file) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between p-4 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <button onClick={clear} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={clsx(
        "relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer",
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-blue-400",
        className
      )}
    >
      <Upload className="h-10 w-10 text-gray-400 mb-3" />
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Drag and drop your CSV file here, or{" "}
        <span className="text-blue-600 font-medium">click to browse</span>
      </p>
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
