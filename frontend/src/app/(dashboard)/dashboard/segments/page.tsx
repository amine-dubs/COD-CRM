"use client";

import { useState, useEffect } from "react";
import { AiSpinner } from "@/components/ai/AiSpinner";
import { AiAlert } from "@/components/ai/AiAlert";
import { SegmentPieChart } from "@/components/ai/SegmentPieChart";
import { SegmentBarChart } from "@/components/ai/SegmentBarChart";
import { SegmentDetailsTable } from "@/components/ai/SegmentDetailsTable";
import { mlApi } from "@/lib/api/ml-client";
import type { SegmentMetricEntry } from "@/types/ai";

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Record<string, SegmentMetricEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const metricsRes = await mlApi.getMetrics();
        setSegments(metricsRes.data.segmentation.segments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load segments");
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

  if (error || !segments) {
    return <AiAlert variant="error">{error || "No segmentation data available"}</AiAlert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Segments</h1>
        <p className="text-sm text-muted-foreground">RFM-based customer clustering analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SegmentPieChart segments={segments} />
        <SegmentBarChart segments={segments} />
      </div>

      <SegmentDetailsTable segments={segments} />
    </div>
  );
}
