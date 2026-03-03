"use client";

import { useState, useEffect, useCallback } from "react";
import type { ForecastResult, TrainingMetrics } from "@/lib/types";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { ForecastLineChart } from "@/components/forecast/ForecastLineChart";
import { ForecastControls } from "@/components/forecast/ForecastControls";

export default function ForecastPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [periods, setPeriods] = useState(30);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available categories from metrics
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const response = await api.getMetrics();
        const metrics: TrainingMetrics = response.data;
        const cats = metrics.forecasting.models_trained;
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load categories"
        );
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Fetch forecast whenever category or periods change
  const fetchForecast = useCallback(async () => {
    if (!selectedCategory) return;
    try {
      setForecastLoading(true);
      setError(null);
      const response = await api.getForecast(selectedCategory, periods);
      setForecast(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load forecast"
      );
      setForecast(null);
    } finally {
      setForecastLoading(false);
    }
  }, [selectedCategory, periods]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error && !forecast) {
    return (
      <Alert variant="error">
        <p className="font-medium">Failed to load forecast data</p>
        <p className="mt-1">{error}</p>
      </Alert>
    );
  }

  // Compute summary stats from predictions
  const summaryStats = forecast
    ? (() => {
        const preds = forecast.predictions;
        const values = preds.map((p) => p.yhat);
        const total = values.reduce((s, v) => s + v, 0);
        const avg = total / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { total, avg, min, max };
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Demand Forecast
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          LightGBM demand forecasting with Algerian calendar covariates
        </p>
      </div>

      {/* Controls */}
      <Card>
        <ForecastControls
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          periods={periods}
          onPeriodsChange={setPeriods}
        />
      </Card>

      {/* Error banner (non-blocking) */}
      {error && (
        <Alert variant="warning">
          {error}
        </Alert>
      )}

      {/* Loading state for forecast */}
      {forecastLoading && (
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {/* Chart */}
      {!forecastLoading && forecast && (
        <>
          <ForecastLineChart
            predictions={forecast.predictions}
            category={forecast.category}
            event_annotations={forecast.event_annotations}
          />

          {/* Summary stats */}
          {summaryStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Predicted
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(summaryStats.total)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Daily Average
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(summaryStats.avg)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Min Daily
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(summaryStats.min)}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Max Daily
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(summaryStats.max)}
                </p>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
