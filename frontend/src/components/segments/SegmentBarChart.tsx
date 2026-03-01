"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SegmentMetricEntry } from "@/lib/types";
import { getSegmentColor, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface SegmentBarChartProps {
  segments: Record<string, SegmentMetricEntry>;
}

interface BarDataItem {
  name: string;
  avg_monetary: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Avg. Monetary: {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function SegmentBarChart({ segments }: SegmentBarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const data: BarDataItem[] = Object.entries(segments).map(
    ([name, entry]) => ({
      name,
      avg_monetary: entry.avg_monetary,
      color: getSegmentColor(name),
    })
  );

  return (
    <Card title="Average Monetary Value by Segment">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avg_monetary" radius={[6, 6, 0, 0]} barSize={48}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
