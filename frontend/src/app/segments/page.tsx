"use client";

import { useState, useEffect, useCallback } from "react";
import type { TrainingMetrics } from "@/lib/types";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { SegmentPieChart } from "@/components/segments/SegmentPieChart";
import { SegmentBarChart } from "@/components/segments/SegmentBarChart";
import { SegmentDetailsTable } from "@/components/segments/SegmentDetailsTable";

export default function SegmentsPage() {
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getMetrics();
      setMetrics(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <p className="font-medium">Failed to load segmentation data</p>
        <p className="mt-1">{error}</p>
      </Alert>
    );
  }

  if (!metrics) return null;

  const { segmentation } = metrics;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Customer Segments
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatNumber(segmentation.total_customers)} customers clustered into{" "}
          {segmentation.n_clusters} segments using {segmentation.algorithm}
        </p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SegmentPieChart segments={segmentation.segments} />
        <SegmentBarChart segments={segmentation.segments} />
      </div>

      {/* Details table */}
      <SegmentDetailsTable
        segments={segmentation.segments}
        totalCustomers={segmentation.total_customers}
      />
    </div>
  );
}
