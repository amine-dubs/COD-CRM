"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { CurrentMetricsDisplay } from "@/components/retrain/CurrentMetricsDisplay";
import { CsvUploadForm } from "@/components/retrain/CsvUploadForm";
import { DataFormatInfo } from "@/components/retrain/DataFormatInfo";
import { RestoreDefaultsButton } from "@/components/retrain/RestoreDefaultsButton";
import type { TrainingMetrics, DataFormatInfo as DataFormatType, RetrainingResult } from "@/lib/types";

export default function RetrainPage() {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [format, setFormat] = useState<DataFormatType | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<RetrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [metricsRes, formatRes] = await Promise.all([
          api.getMetrics(),
          api.getDataFormat(),
        ]);
        setMetrics(metricsRes.data);
        setFormat(formatRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      const res = await api.uploadAndTrain(file);
      setResult(res.data);
      setSuccess("Models retrained successfully! Refreshing metrics...");
      const metricsRes = await api.getMetrics();
      setMetrics(metricsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retraining failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      await api.restoreDefaults();
      setSuccess("Default models restored. Refreshing metrics...");
      const metricsRes = await api.getMetrics();
      setMetrics(metricsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Model Retraining
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Upload new data to retrain all AI models
          </p>
        </div>
        <RestoreDefaultsButton onRestore={handleRestore} isLoading={restoring} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {result && (
        <Alert variant="info">
          <div className="space-y-1">
            <p className="font-medium">Retraining Complete</p>
            <p>Orders processed: {result.orders_processed}</p>
            <p>Delivery rate: {(result.delivery_rate * 100).toFixed(1)}%</p>
            <p>Risk AUC: {result.risk_auc.toFixed(4)} | F1: {result.risk_f1.toFixed(4)}</p>
            <p>Segments found: {result.segments_found}</p>
            <p>Forecast models: {result.forecast_models}</p>
          </div>
        </Alert>
      )}

      {metrics && <CurrentMetricsDisplay metrics={metrics} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CsvUploadForm onUpload={handleUpload} isLoading={uploading} />
        {format && <DataFormatInfo format={format} />}
      </div>
    </div>
  );
}
