"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AiCard } from "@/components/ai/AiCard";
import { useI18n } from "@/providers/i18n-provider";
import type { OrderRiskRequest } from "@/types/ai";

interface RiskPredictionFormProps {
  onSubmit: (data: OrderRiskRequest) => void;
  isLoading: boolean;
}

const DEFAULT_VALUES: OrderRiskRequest = {
  subtotal: 0, shipping_cost: 0, total_amount: 0, n_items: 1,
  is_repeat_customer: false, customer_order_count: 0, customer_total_spent: 0,
  estimated_delivery_days: 7, avg_product_weight: 1.0,
  avg_photos: 1.0, avg_desc_length: 500, avg_name_length: 30, avg_volume: 10000,
  seller_customer_same_state: 0, n_sellers: 1,
};

export function RiskPredictionForm({ onSubmit, isLoading }: RiskPredictionFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState(DEFAULT_VALUES);

  const update = (field: keyof OrderRiskRequest, value: string | boolean | number) => {
    setForm((prev) => {
      const updated = {
        ...prev,
        [field]: typeof value === "boolean" ? value : typeof value === "string" ? (Number(value) || value) : value,
      };
      // Auto-calculate total_amount when subtotal or shipping_cost changes
      if (field === "subtotal" || field === "shipping_cost") {
        updated.total_amount = (Number(updated.subtotal) || 0) + (Number(updated.shipping_cost) || 0);
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <AiCard title={t("ai.order_details")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("ai.subtotal")} type="number" value={form.subtotal} onChange={(e) => update("subtotal", e.target.value)} />
          <Input label={t("ai.shipping_cost")} type="number" value={form.shipping_cost} onChange={(e) => update("shipping_cost", e.target.value)} />
          <Input label={`${t("ai.total_amount")} (DZD)`} type="number" value={form.total_amount} disabled className="bg-muted" />
          <Input label={t("ai.n_items")} type="number" min={1} value={form.n_items} onChange={(e) => update("n_items", e.target.value)} />
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("ai.customer_info")}</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("ai.customer_order_count")} type="number" min={0} value={form.customer_order_count} onChange={(e) => update("customer_order_count", e.target.value)} />
            <Input label={`${t("ai.customer_total_spent")} (DZD)`} type="number" min={0} value={form.customer_total_spent} onChange={(e) => update("customer_total_spent", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-foreground">
            <input type="checkbox" checked={form.is_repeat_customer} onChange={(e) => update("is_repeat_customer", e.target.checked)} className="rounded border-input" />
            {t("ai.is_repeat_customer")}
          </label>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("ai.logistics")}</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("ai.estimated_delivery_days")} type="number" min={1} value={form.estimated_delivery_days} onChange={(e) => update("estimated_delivery_days", e.target.value)} />
            <Input label={t("ai.avg_product_weight")} type="number" min={0} step={0.1} value={form.avg_product_weight} onChange={(e) => update("avg_product_weight", e.target.value)} />
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
          {t("ai.predict_risk")}
        </Button>
      </form>
    </AiCard>
  );
}
