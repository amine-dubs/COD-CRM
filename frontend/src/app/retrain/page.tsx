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
  const [dbTraining, setDbTraining] = useState(false);
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

  const handleDatabaseRetrain = async () => {
    setDbTraining(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      const res = await api.retrainFromDatabase();
      setResult(res.data);
      setSuccess("Models retrained from database successfully! Refreshing metrics...");
      const metricsRes = await api.getMetrics();
      setMetrics(metricsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Database retraining failed");
    } finally {
      setDbTraining(false);
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

  const isTraining = uploading || dbTraining;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Model Retraining
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Retrain AI models from your database or upload custom data
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

      {/* Database Retrain - Primary option */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Retrain from Database
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Automatically export all finalized orders (delivered, cancelled, returned) from your
              database and retrain the AI models. No file upload needed.
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
              <li>- Extracts orders with product categories, regions, and shipping data</li>
              <li>- Automatically computes customer history and feature engineering</li>
              <li>- Retrains risk prediction, customer segmentation, and demand forecasting</li>
              <li>- Previous models are backed up before retraining</li>
            </ul>
            <button
              onClick={handleDatabaseRetrain}
              disabled={isTraining}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {dbTraining ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Training from Database...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.182-3.182" />
                  </svg>
                  Retrain from Database
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 dark:bg-gray-900 px-4 text-gray-500 dark:text-gray-400">
            or upload custom CSV data
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CsvUploadForm onUpload={handleUpload} isLoading={uploading} />
        {format && <DataFormatInfo format={format} />}
      </div>
    </div>
  );
}
