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
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ForecastPrediction, EventAnnotation, ForecastEventType } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const EVENT_COLORS: Record<ForecastEventType, string> = {
  ramadan_start: "#10B981",
  eid_al_fitr: "#F59E0B",
  eid_al_adha: "#F97316",
  mawlid: "#8B5CF6",
  algerian_holiday: "#EF4444",
};

interface ForecastLineChartProps {
  predictions: ForecastPrediction[];
  category: string;
  event_annotations?: EventAnnotation[];
}

interface ChartDataItem {
  date: string;
  rawDate: string;
  yhat: number;
  band: [number, number];
}

function CustomTooltip({
  active,
  payload,
  label,
  annotationsByDate,
}: {
  active?: boolean;
  payload?: { value: number | [number, number]; dataKey: string }[];
  label?: string;
  annotationsByDate?: Record<string, EventAnnotation[]>;
}) {
  if (!active || !payload?.length) return null;

  const yhat = payload.find((p) => p.dataKey === "yhat");
  const band = payload.find((p) => p.dataKey === "band");
  const bandValue = band?.value as [number, number] | undefined;
  const events = label && annotationsByDate ? annotationsByDate[label] : undefined;

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
      {events?.map((ev, i) => (
        <p
          key={i}
          className="text-xs font-medium mt-1"
          style={{ color: EVENT_COLORS[ev.event] }}
        >
          {ev.label}
        </p>
      ))}
    </div>
  );
}

export function ForecastLineChart({
  predictions,
  category,
  event_annotations = [],
}: ForecastLineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const data: ChartDataItem[] = predictions.map((p) => ({
    rawDate: p.ds,
    date: new Date(p.ds).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    yhat: Math.round(p.yhat),
    band: [Math.round(p.yhat_lower), Math.round(p.yhat_upper)],
  }));

  // Map raw ISO dates to formatted chart dates for reference line lookup
  const rawToFormatted: Record<string, string> = {};
  data.forEach((d) => {
    rawToFormatted[d.rawDate] = d.date;
  });

  // Group annotations by formatted date (for tooltip)
  const annotationsByDate: Record<string, EventAnnotation[]> = {};
  for (const ann of event_annotations) {
    const fmt = rawToFormatted[ann.date];
    if (fmt) {
      if (!annotationsByDate[fmt]) annotationsByDate[fmt] = [];
      annotationsByDate[fmt].push(ann);
    }
  }

  return (
    <Card
      title={`Demand Forecast: ${category}`}
      subtitle={`${predictions.length}-day prediction with confidence interval`}
    >
      {event_annotations.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {event_annotations.map((ann, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border"
              style={{
                color: EVENT_COLORS[ann.event],
                borderColor: EVENT_COLORS[ann.event],
                backgroundColor: `${EVENT_COLORS[ann.event]}18`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: EVENT_COLORS[ann.event] }}
              />
              {ann.label}
            </span>
          ))}
        </div>
      )}
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
            <Tooltip
              content={
                <CustomTooltip annotationsByDate={annotationsByDate} />
              }
            />
            {event_annotations.map((ann, i) => {
              const xVal = rawToFormatted[ann.date];
              if (!xVal) return null;
              return (
                <ReferenceLine
                  key={i}
                  x={xVal}
                  stroke={EVENT_COLORS[ann.event]}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  label={{
                    value: ann.label,
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: EVENT_COLORS[ann.event],
                    angle: -90,
                    offset: 4,
                  }}
                />
              );
            })}
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
