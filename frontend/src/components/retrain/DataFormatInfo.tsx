"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { DataFormatInfo as DataFormatType } from "@/lib/types";

export function DataFormatInfo({ format }: { format: DataFormatType }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Required CSV Format
        </h3>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Required Columns
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">
                      Column
                    </th>
                    <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(format.required_columns).map(([col, desc]) => (
                    <tr
                      key={col}
                      className="border-b border-gray-100 dark:border-gray-700/50"
                    >
                      <td className="py-2 pr-4">
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">
                          {col}
                        </code>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {Object.keys(format.optional_columns).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optional Columns
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">
                        Column
                      </th>
                      <th className="text-left py-2 font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(format.optional_columns).map(([col, desc]) => (
                      <tr
                        key={col}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="py-2 pr-4">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-600 dark:text-gray-400">
                            {col}
                          </code>
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">
                          {desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {format.notes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </h4>
              <ul className="space-y-1">
                {format.notes.map((note, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <span className="text-gray-400 mt-0.5">&#8226;</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
