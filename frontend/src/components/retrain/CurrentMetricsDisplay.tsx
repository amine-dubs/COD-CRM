"use client";

import { Card } from "@/components/ui/Card";
import { Shield, Target, Users, TrendingUp, Database, Calendar } from "lucide-react";
import { formatMetric, formatPercent, formatNumber } from "@/lib/utils";
import type { TrainingMetrics } from "@/lib/types";

interface MetricItem {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

export function CurrentMetricsDisplay({ metrics }: { metrics: TrainingMetrics }) {
  const items: MetricItem[] = [
    {
      label: "Risk AUC-ROC",
      value: formatMetric(metrics.risk_prediction.models.ensemble?.auc_roc ?? 0),
      icon: Shield,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Risk F1-Score",
      value: formatMetric(metrics.risk_prediction.models.ensemble?.f1_score ?? 0),
      icon: Target,
      color: "text-green-600 bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Customer Segments",
      value: String(metrics.segmentation.n_clusters),
      icon: Users,
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Forecast MAE Improvement",
      value: `${metrics.forecasting.improvement_mae_pct.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Total Orders",
      value: formatNumber(metrics.total_orders),
      icon: Database,
      color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
    },
    {
      label: "Delivery Rate",
      value: formatPercent(metrics.delivery_rate),
      icon: Calendar,
      color: "text-teal-600 bg-teal-100 dark:bg-teal-900/30",
    },
  ];

  return (
    <Card title="Current Model Metrics" subtitle={`Trained: ${metrics.trained_at}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
