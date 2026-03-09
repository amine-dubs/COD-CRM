"use client";

import { useState, useEffect } from "react";
import { AiSpinner } from "@/components/ai/AiSpinner";
import { AiAlert } from "@/components/ai/AiAlert";
import { MetricsSummaryGrid } from "@/components/ai/MetricsSummaryGrid";
import { ModelPerformanceTable } from "@/components/ai/ModelPerformanceTable";
import { mlApi } from "@/lib/api/ml-client";
import type { TrainingMetrics, AiHealthStatus } from "@/types/ai";

export default function AiDashboardPage() {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [health, setHealth] = useState<AiHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [metricsRes, healthRes] = await Promise.all([
          mlApi.getMetrics(),
          mlApi.getHealth().catch(() => null),
        ]);
        setMetrics(metricsRes.data);
        setHealth(healthRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <AiSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !metrics) {
    return <AiAlert variant="error">{error || "No metrics available"}</AiAlert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Dashboard</h1>
          <p className="text-sm text-muted-foreground">Machine learning model overview & performance</p>
        </div>
        {health && (
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${health.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-muted-foreground">
              ML Service {health.status === "ok" ? "Online" : "Offline"}
            </span>
          </div>
        )}
      </div>

      <MetricsSummaryGrid metrics={metrics} />
      <ModelPerformanceTable models={metrics.risk_prediction.models} />
    </div>
  );
}
