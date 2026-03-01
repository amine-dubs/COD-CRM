"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { SegmentMetricEntry } from "@/lib/types";
import { getSegmentColor, formatPercent } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface SegmentPieChartProps {
  segments: Record<string, SegmentMetricEntry>;
}

interface PieDataItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PieDataItem }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {item.name}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {item.value} customers ({formatPercent(item.percentage / 100, 1)})
      </p>
    </div>
  );
}

export function SegmentPieChart({ segments }: SegmentPieChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const data: PieDataItem[] = Object.entries(segments).map(
    ([name, entry]) => ({
      name,
      value: entry.count,
      percentage: entry.percentage,
      color: getSegmentColor(name),
    })
  );

  return (
    <Card title="Segment Distribution">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={(props: PieLabelRenderProps) => {
                const item = props as PieLabelRenderProps & { percentage: number };
                return `${props.name} (${item.percentage.toFixed(1)}%)`;
              }}
              labelLine
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
