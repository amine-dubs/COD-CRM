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
  total_amount: 0,
  n_items: 1,
  is_repeat_customer: false,
  customer_order_count: 0,
  customer_total_spent: 0,
  estimated_delivery_days: 7,
  avg_product_weight: 1.0,
  payment_method: "cod",
  n_payment_methods: 1,
  max_installments: 1,
  avg_photos: 1.0,
  avg_desc_length: 500,
  avg_name_length: 30,
  avg_volume: 10000,
  seller_customer_same_state: 0,
  n_sellers: 1,
};

const PAYMENT_OPTIONS = [
  { value: "cod", label: "Cash on Delivery (COD)" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "boleto", label: "Boleto" },
  { value: "voucher", label: "Voucher" },
];

export function RiskPredictionForm({
  onSubmit,
  isLoading,
}: RiskPredictionFormProps) {
  const [form, setForm] = useState(DEFAULT_VALUES);

  const update = (field: keyof OrderRiskRequest, value: string | boolean | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: typeof value === "boolean" ? value : typeof value === "string" ? (Number(value) || value) : value,
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
            label="Items Count"
            type="number"
            min={1}
            value={form.n_items}
            onChange={(e) => update("n_items", e.target.value)}
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Payment
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={form.payment_method || "cod"}
                onChange={(e) => update("payment_method", e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Max Installments"
              type="number"
              min={1}
              value={form.max_installments}
              onChange={(e) => update("max_installments", e.target.value)}
            />
          </div>
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
              label="Total Spent (DZD)"
              type="number"
              min={0}
              value={form.customer_total_spent}
              onChange={(e) => update("customer_total_spent", e.target.value)}
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
              label="Avg Product Weight (kg)"
              type="number"
              min={0}
              step={0.1}
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
