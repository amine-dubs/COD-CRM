"use client";

import { AiCard } from "@/components/ai/AiCard";
import { Button } from "@/components/ui/button";

interface ForecastControlsProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  periods: number;
  onPeriodsChange: (p: number) => void;
  onFetch: () => void;
  isLoading: boolean;
}

export function ForecastControls({
  categories,
  selectedCategory,
  onCategoryChange,
  periods,
  onPeriodsChange,
  onFetch,
  isLoading,
}: ForecastControlsProps) {
  return (
    <AiCard title="Forecast Parameters">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Forecast Period: {periods} days
          </label>
          <input
            type="range"
            min={7}
            max={90}
            value={periods}
            onChange={(e) => onPeriodsChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>7 days</span>
            <span>90 days</span>
          </div>
        </div>

        <Button onClick={onFetch} isLoading={isLoading} className="w-full">
          Generate Forecast
        </Button>
      </div>
    </AiCard>
  );
}
