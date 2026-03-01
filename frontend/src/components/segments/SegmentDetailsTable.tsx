import type { SegmentMetricEntry } from "@/lib/types";
import {
  getSegmentColor,
  formatNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface SegmentDetailsTableProps {
  segments: Record<string, SegmentMetricEntry>;
  totalCustomers: number;
}

export function SegmentDetailsTable({
  segments,
  totalCustomers,
}: SegmentDetailsTableProps) {
  const entries = Object.entries(segments);

  return (
    <Card title="Segment Details" subtitle={`${formatNumber(totalCustomers)} total customers`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Segment
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Customers
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                %
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Avg Recency
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Avg Frequency
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                Avg Monetary
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, entry]) => (
              <tr
                key={name}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getSegmentColor(name) }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {name}
                    </span>
                  </div>
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatNumber(entry.count)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatPercent(entry.percentage / 100)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatNumber(entry.avg_recency)} days
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {entry.avg_frequency.toFixed(1)}
                </td>
                <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                  {formatCurrency(entry.avg_monetary)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
