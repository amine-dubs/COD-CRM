"use client";

interface ForecastControlsProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  periods: number;
  onPeriodsChange: (periods: number) => void;
}

export function ForecastControls({
  categories,
  selectedCategory,
  onCategoryChange,
  periods,
  onPeriodsChange,
}: ForecastControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
      {/* Category selector */}
      <div className="w-full sm:w-64">
        <label
          htmlFor="forecast-category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Product Category
        </label>
        <select
          id="forecast-category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Periods slider */}
      <div className="w-full sm:w-72">
        <label
          htmlFor="forecast-periods"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Forecast Horizon: {periods} days
        </label>
        <input
          id="forecast-periods"
          type="range"
          min={7}
          max={90}
          step={1}
          value={periods}
          onChange={(e) => onPeriodsChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>7 days</span>
          <span>90 days</span>
        </div>
      </div>
    </div>
  );
}
