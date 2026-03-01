"use client";

import { Shield, Target, Users, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMetric } from "@/lib/utils";
import type { TrainingMetrics } from "@/lib/types";

const METRICS_CONFIG = [
  {
    label: "Risk AUC-ROC",
    icon: Shield,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    getValue: (m: TrainingMetrics) =>
      formatMetric(m.risk_prediction.models.ensemble?.auc_roc ?? 0),
  },
  {
    label: "Risk F1-Score",
    icon: Target,
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
    getValue: (m: TrainingMetrics) =>
      formatMetric(m.risk_prediction.models.ensemble?.f1_score ?? 0),
  },
  {
    label: "Customer Segments",
    icon: Users,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
    getValue: (m: TrainingMetrics) => String(m.segmentation.n_clusters),
  },
  {
    label: "Forecast Improvement",
    icon: TrendingUp,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    getValue: (m: TrainingMetrics) =>
      `${m.forecasting.improvement_mae_pct.toFixed(1)}%`,
  },
];

export function MetricsSummaryGrid({
  metrics,
}: {
  metrics: TrainingMetrics;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS_CONFIG.map(({ label, icon: Icon, color, getValue }) => (
        <Card key={label}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getValue(metrics)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {label}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
