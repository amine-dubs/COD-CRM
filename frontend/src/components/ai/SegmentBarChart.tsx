"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AiCard } from "@/components/ai/AiCard";
import type { SegmentMetricEntry } from "@/types/ai";

interface SegmentBarChartProps {
  segments: Record<string, SegmentMetricEntry>;
}

export function SegmentBarChart({ segments }: SegmentBarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = Object.entries(segments).map(([name, s]) => ({
    name,
    recency: Math.round(s.avg_recency),
    frequency: Math.round(s.avg_frequency * 10) / 10,
    monetary: Math.round(s.avg_monetary),
  }));

  if (!mounted) {
    return (
      <AiCard title="RFM Comparison">
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
      </AiCard>
    );
  }

  return (
    <AiCard title="RFM Comparison" subtitle="Average Recency, Frequency & Monetary by segment">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend />
          <Bar dataKey="recency" name="Recency (days)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="frequency" name="Frequency" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="monetary" name="Monetary (DZD)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AiCard>
  );
}
