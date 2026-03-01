"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ForecastPrediction } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface ForecastLineChartProps {
  predictions: ForecastPrediction[];
  category: string;
}

interface ChartDataItem {
  date: string;
  yhat: number;
  band: [number, number];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | [number, number]; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const yhat = payload.find((p) => p.dataKey === "yhat");
  const band = payload.find((p) => p.dataKey === "band");
  const bandValue = band?.value as [number, number] | undefined;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </p>
      {yhat && (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Forecast: {formatNumber(yhat.value as number)}
        </p>
      )}
      {bandValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Range: {formatNumber(bandValue[0])} - {formatNumber(bandValue[1])}
        </p>
      )}
    </div>
  );
}

export function ForecastLineChart({
  predictions,
  category,
}: ForecastLineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const data: ChartDataItem[] = predictions.map((p) => ({
    date: new Date(p.ds).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    yhat: Math.round(p.yhat),
    band: [Math.round(p.yhat_lower), Math.round(p.yhat_upper)],
  }));

  return (
    <Card
      title={`Demand Forecast: ${category}`}
      subtitle={`${predictions.length}-day prediction with confidence interval`}
    >
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="text-gray-600 dark:text-gray-400"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              dataKey="band"
              fill="#3B82F6"
              fillOpacity={0.15}
              stroke="none"
              type="monotone"
            />
            <Line
              dataKey="yhat"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
