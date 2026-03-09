"use client";

import { AiCard } from "@/components/ai/AiCard";
import { formatNumber, formatAiCurrency } from "@/lib/utils/ai";
import type { SegmentMetricEntry } from "@/types/ai";

interface SegmentDetailsTableProps {
  segments: Record<string, SegmentMetricEntry>;
}

export function SegmentDetailsTable({ segments }: SegmentDetailsTableProps) {
  return (
    <AiCard title="Segment Details">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Segment</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Customers</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">%</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Recency</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Frequency</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Monetary</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(segments).map(([name, s]) => (
              <tr key={name} className="border-b border-border hover:bg-accent">
                <td className="py-3 px-4 font-medium text-foreground">{name}</td>
                <td className="text-right py-3 px-4 text-muted-foreground">{formatNumber(s.count)}</td>
                <td className="text-right py-3 px-4 text-muted-foreground">{s.percentage.toFixed(1)}%</td>
                <td className="text-right py-3 px-4 text-muted-foreground">{Math.round(s.avg_recency)} days</td>
                <td className="text-right py-3 px-4 text-muted-foreground">{s.avg_frequency.toFixed(1)}</td>
                <td className="text-right py-3 px-4 text-muted-foreground">{formatAiCurrency(s.avg_monetary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AiCard>
  );
}
