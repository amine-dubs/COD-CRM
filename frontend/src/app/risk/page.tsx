"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { RiskPredictionForm } from "@/components/risk/RiskPredictionForm";
import { RiskResultCard } from "@/components/risk/RiskResultCard";
import type { OrderRiskRequest, RiskPredictionResult } from "@/lib/types";

export default function RiskPage() {
  const [result, setResult] = useState<RiskPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: OrderRiskRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictOrderRisk(data);
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Risk Prediction
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Predict delivery risk for an order
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskPredictionForm onSubmit={handleSubmit} isLoading={loading} />
        {result && <RiskResultCard result={result} />}
      </div>
    </div>
  );
}
