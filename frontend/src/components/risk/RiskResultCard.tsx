"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScoreGauge } from "./RiskScoreGauge";
import { AlertTriangle } from "lucide-react";
import { RISK_COLORS } from "@/lib/utils";
import type { RiskPredictionResult } from "@/lib/types";

export function RiskResultCard({ result }: { result: RiskPredictionResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center gap-4">
          <RiskScoreGauge
            score={result.success_probability * 100}
            category={result.category}
          />
          <Badge variant={result.category}>
            {result.category.toUpperCase()} RISK
          </Badge>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 max-w-md">
            {result.recommendation}
          </p>
        </div>
      </Card>

      {result.reasons.length > 0 && (
        <Card title="Risk Factors">
          <ul className="space-y-2">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">
                  {reason}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Model Scores">
        <div className="space-y-3">
          {Object.entries(result.model_scores).map(([name, score]) => (
            <div key={name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize text-gray-700 dark:text-gray-300">
                  {name}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {score.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(score, 100)}%`,
                    backgroundColor: RISK_COLORS[result.category].fill,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
