"use client";

import { RISK_COLORS } from "@/lib/utils";
import type { RiskCategory } from "@/lib/types";

interface RiskScoreGaugeProps {
  score: number;
  category: RiskCategory;
}

export function RiskScoreGauge({ score, category }: RiskScoreGaugeProps) {
  const radius = 80;
  const stroke = 12;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75; // 270 degrees
  const filled = (score / 100) * arc;
  const offset = arc - filled;
  const color = RISK_COLORS[category].fill;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200 dark:text-gray-700"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="text-3xl font-bold fill-gray-900 dark:fill-white"
          style={{ fontSize: "2rem" }}
        >
          {score.toFixed(1)}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          className="fill-gray-500 dark:fill-gray-400"
          style={{ fontSize: "0.85rem", textTransform: "capitalize" }}
        >
          {category} risk
        </text>
      </svg>
    </div>
  );
}
