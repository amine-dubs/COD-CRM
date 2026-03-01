"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button } from "@/components/ui/Button";

interface CsvUploadFormProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

export function CsvUploadForm({ onUpload, isLoading }: CsvUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload(file);
  };

  return (
    <Card title="Upload Training Data" subtitle="Upload a CSV file to retrain all models">
      <div className="space-y-4">
        <FileUpload onFileSelect={setFile} accept=".csv" />
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!file || isLoading}
          className="w-full"
          size="lg"
        >
          Upload &amp; Train
        </Button>
      </div>
    </Card>
  );
}
