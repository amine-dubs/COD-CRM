"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { OrderRiskRequest } from "@/lib/types";

interface RiskPredictionFormProps {
  onSubmit: (data: OrderRiskRequest) => void;
  isLoading: boolean;
}

const DEFAULT_VALUES: OrderRiskRequest = {
  subtotal: 0,
  shipping_cost: 0,
  discount: 0,
  total_amount: 0,
  n_items: 1,
  source: "manual",
  is_repeat_customer: false,
  customer_order_count: 0,
  customer_success_rate: 0.5,
  estimated_delivery_days: 7,
  avg_product_weight: 1.0,
};

export function RiskPredictionForm({
  onSubmit,
  isLoading,
}: RiskPredictionFormProps) {
  const [form, setForm] = useState(DEFAULT_VALUES);

  const update = (field: keyof OrderRiskRequest, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === "boolean" ? value : Number(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Card title="Order Details" subtitle="Enter order data to predict risk">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Total Amount (DZD)"
            type="number"
            value={form.total_amount}
            onChange={(e) => update("total_amount", e.target.value)}
          />
          <Input
            label="Subtotal"
            type="number"
            value={form.subtotal}
            onChange={(e) => update("subtotal", e.target.value)}
          />
          <Input
            label="Shipping Cost"
            type="number"
            value={form.shipping_cost}
            onChange={(e) => update("shipping_cost", e.target.value)}
          />
          <Input
            label="Discount"
            type="number"
            value={form.discount}
            onChange={(e) => update("discount", e.target.value)}
          />
          <Input
            label="Items Count"
            type="number"
            min={1}
            value={form.n_items}
            onChange={(e) => update("n_items", e.target.value)}
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Customer Info
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Order Count"
              type="number"
              min={0}
              value={form.customer_order_count}
              onChange={(e) => update("customer_order_count", e.target.value)}
            />
            <Input
              label="Success Rate (0-1)"
              type="number"
              step={0.1}
              min={0}
              max={1}
              value={form.customer_success_rate}
              onChange={(e) => update("customer_success_rate", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.is_repeat_customer}
              onChange={(e) => update("is_repeat_customer", e.target.checked)}
              className="rounded border-gray-300"
            />
            Repeat Customer
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Logistics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Est. Delivery Days"
              type="number"
              min={1}
              value={form.estimated_delivery_days}
              onChange={(e) => update("estimated_delivery_days", e.target.value)}
            />
            <Input
              label="Avg Product Weight (g)"
              type="number"
              min={0}
              value={form.avg_product_weight}
              onChange={(e) => update("avg_product_weight", e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
          Predict Risk
        </Button>
      </form>
    </Card>
  );
}
