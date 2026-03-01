"use client";

import { Card } from "@/components/ui/Card";
import { formatMetric } from "@/lib/utils";
import type { ModelMetric } from "@/lib/types";

export function ModelPerformanceTable({
  models,
}: {
  models: Record<string, ModelMetric>;
}) {
  return (
    <Card title="Model Comparison">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Model
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                AUC-ROC
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Accuracy
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Precision
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Recall
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                F1-Score
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(models).map(([name, m]) => (
              <tr
                key={name}
                className={`border-b border-gray-100 dark:border-gray-800 ${
                  name === "ensemble"
                    ? "bg-blue-50 dark:bg-blue-900/20 font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <td className="py-3 px-4 capitalize text-gray-900 dark:text-gray-100">
                  {name}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatMetric(m.auc_roc)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatMetric(m.accuracy)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatMetric(m.precision)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatMetric(m.recall)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatMetric(m.f1_score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
