"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { MetricsSummaryGrid } from "@/components/dashboard/MetricsSummaryGrid";
import { ModelPerformanceTable } from "@/components/dashboard/ModelPerformanceTable";
import { Calendar, Database, Package, BarChart3 } from "lucide-react";
import type { TrainingMetrics } from "@/lib/types";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getMetrics();
        setMetrics(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!metrics) return null;

  const infoItems = [
    {
      icon: Calendar,
      label: "Trained",
      value: new Date(metrics.trained_at).toLocaleDateString(),
    },
    { icon: Database, label: "Dataset", value: metrics.dataset },
    {
      icon: Package,
      label: "Total Orders",
      value: formatNumber(metrics.total_orders),
    },
    {
      icon: BarChart3,
      label: "Delivery Rate",
      value: formatPercent(metrics.delivery_rate),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          ML model performance overview
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {infoItems.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <MetricsSummaryGrid metrics={metrics} />
      <ModelPerformanceTable models={metrics.risk_prediction.models} />
    </div>
  );
}
