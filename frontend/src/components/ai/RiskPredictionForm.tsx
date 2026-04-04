"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarPopover } from "@/components/ui/calendar-popover";
import { AiCard } from "@/components/ai/AiCard";
import { useI18n } from "@/providers/i18n-provider";
import { WILAYAS } from "@/lib/constants/wilayas";
import apiClient from "@/lib/api/client";
import type { OrderRiskRequest } from "@/types/ai";
import type { Order } from "@/types/order";

const toLocalDateTimeValue = (date: Date): string => {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  const timezoneOffsetMs = normalized.getTimezoneOffset() * 60 * 1000;
  return new Date(normalized.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const DEFAULT_ORDER_TIME = "12:00";

const parseOrderDateParts = (value?: string): { date: string; time: string } => {
  if (!value) {
    return { date: "", time: DEFAULT_ORDER_TIME };
  }

  const [datePart = "", rawTime = ""] = value.split("T");
  const timePart = rawTime.slice(0, 5);
  const validTime = /^\d{2}:\d{2}$/.test(timePart) ? timePart : DEFAULT_ORDER_TIME;

  return {
    date: datePart,
    time: validTime,
  };
};

const ORDER_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  return { value, label: value };
});

interface RiskPredictionFormProps {
  onSubmit: (data: OrderRiskRequest) => void;
  isLoading: boolean;
}

const DEFAULT_VALUES: OrderRiskRequest = {
  order_date: toLocalDateTimeValue(new Date()),
  subtotal: 0,
  shipping_cost: 0,
  total_amount: 0,
  n_items: 1,
  is_repeat_customer: false,
  customer_order_count: 0,
  customer_total_spent: 0,
  estimated_delivery_days: 7,
  avg_product_weight: 1.0,
  avg_photos: 1.0,
  avg_desc_length: 500,
  avg_name_length: 30,
  avg_volume: 10000,
  seller_customer_same_state: undefined,
  n_sellers: 1,
};

const NUMERIC_FIELDS: Set<keyof OrderRiskRequest> = new Set([
  "wilaya_id",
  "subtotal",
  "shipping_cost",
  "total_amount",
  "n_items",
  "customer_order_count",
  "customer_total_spent",
  "estimated_delivery_days",
  "avg_product_weight",
  "avg_photos",
  "avg_desc_length",
  "avg_name_length",
  "avg_volume",
  "seller_customer_same_state",
  "n_sellers",
]);

const OPTIONAL_FIELDS: Set<keyof OrderRiskRequest> = new Set([
  "wilaya_id",
  "customer_state",
  "product_category",
  "order_date",
  "seller_customer_same_state",
]);

export function RiskPredictionForm({ onSubmit, isLoading }: RiskPredictionFormProps) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedExistingOrderId, setSelectedExistingOrderId] = useState("");
  const [existingOrderLoading, setExistingOrderLoading] = useState(false);
  const orderDateParts = useMemo(() => parseOrderDateParts(form.order_date), [form.order_date]);

  useEffect(() => {
    let active = true;

    const loadCategoryOptions = async () => {
      setCategoriesLoading(true);
      try {
        const res = await apiClient.get("/products?per_page=500");
        const products: Array<{ category?: unknown }> = Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        const categories = Array.from<string>(
          new Set(
            products
              .map((item) =>
                typeof item?.category === "string" ? item.category.trim() : ""
              )
              .filter((value) => value.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (active) {
          setCategoryOptions(categories);
        }
      } catch {
        if (active) {
          setCategoryOptions([]);
        }
      } finally {
        if (active) {
          setCategoriesLoading(false);
        }
      }
    };

    const loadRecentOrders = async () => {
      setOrdersLoading(true);
      try {
        const res = await apiClient.get("/orders?page=1&per_page=50&sort=created_at&direction=desc");
        const fetchedOrders: Order[] = Array.isArray(res.data?.data) ? res.data.data : [];
        if (active) {
          setExistingOrders(fetchedOrders);
        }
      } catch {
        if (active) {
          setExistingOrders([]);
        }
      } finally {
        if (active) {
          setOrdersLoading(false);
        }
      }
    };

    void Promise.all([loadCategoryOptions(), loadRecentOrders()]);

    return () => {
      active = false;
    };
  }, []);

  const existingOrderOptions = useMemo(
    () =>
      existingOrders.map((order) => ({
        value: String(order.id),
        label: `${order.reference} — ${order.customer_name} — ${Math.round(order.total_amount).toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-DZ" : "en-US")} DZD`,
      })),
    [existingOrders, locale]
  );

  const wilayaOptions = useMemo(
    () => [
      { value: "", label: t("ai.not_provided") },
      ...WILAYAS.map((w) => ({
        value: String(w.id),
        label: `${w.code} - ${locale === "ar" ? w.ar_name : w.name}`,
      })),
    ],
    [locale, t]
  );

  const binaryOptions = [
    { value: "", label: t("ai.not_provided") },
    { value: "1", label: t("yes") },
    { value: "0", label: t("no") },
  ];

  const update = (field: keyof OrderRiskRequest, value: string | boolean | number) => {
    setForm((prev) => {
      let parsed: string | number | boolean | undefined = value;

      if (typeof value === "string") {
        if (value === "") {
          parsed = OPTIONAL_FIELDS.has(field)
            ? undefined
            : NUMERIC_FIELDS.has(field)
              ? 0
              : "";
        } else if (NUMERIC_FIELDS.has(field)) {
          const numericValue = Number(value);
          parsed = Number.isFinite(numericValue) ? numericValue : 0;
        }
      }

      const updated = {
        ...prev,
        [field]: parsed,
      };

      // Auto-calculate total_amount when subtotal or shipping_cost changes
      if (field === "subtotal" || field === "shipping_cost") {
        updated.total_amount = (Number(updated.subtotal) || 0) + (Number(updated.shipping_cost) || 0);
      }

      if (field === "wilaya_id") {
        const selectedWilaya = WILAYAS.find((w) => String(w.id) === String(updated.wilaya_id ?? ""));
        updated.customer_state = selectedWilaya ? selectedWilaya.code : undefined;
      }

      return updated;
    });
  };

  const applyOrderDatePreset = (preset: "now" | "minus_1h" | "yesterday" | "clear") => {
    if (preset === "clear") {
      update("order_date", "");
      return;
    }

    const baseDate = form.order_date ? new Date(form.order_date) : new Date();
    const fallbackDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

    if (preset === "now") {
      update("order_date", toLocalDateTimeValue(new Date()));
      return;
    }

    const nextDate = new Date(fallbackDate);
    if (preset === "minus_1h") {
      nextDate.setHours(nextDate.getHours() - 1);
    } else if (preset === "yesterday") {
      nextDate.setDate(nextDate.getDate() - 1);
    }

    update("order_date", toLocalDateTimeValue(nextDate));
  };

  const applyExistingOrder = async () => {
    if (!selectedExistingOrderId) return;

    setExistingOrderLoading(true);
    setError(null);

    try {
      const res = await apiClient.get(`/orders/${selectedExistingOrderId}`);
      const order = res.data?.data as Order | undefined;

      if (!order) {
        setError(t("ai.existing_order_load_failed"));
        return;
      }

      const ml = order.ml_features ?? {};
      const orderDate = order.created_at
        ? toLocalDateTimeValue(new Date(order.created_at))
        : form.order_date;
      const wilayaCode = order.wilaya_id
        ? WILAYAS.find((w) => w.id === order.wilaya_id)?.code
        : undefined;
      const itemCount = Array.isArray(order.items)
        ? Math.max(
            1,
            order.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 0)), 0)
          )
        : 1;

      setForm((prev) => ({
        ...prev,
        order_id: order.id,
        customer_name: order.customer_name || prev.customer_name,
        customer_phone: order.customer_phone || prev.customer_phone,
        wilaya_id: order.wilaya_id ?? prev.wilaya_id,
        customer_state: wilayaCode ?? prev.customer_state,
        commune: order.commune || prev.commune,
        subtotal: Number(order.subtotal ?? prev.subtotal ?? 0),
        shipping_cost: Number(order.shipping_cost ?? prev.shipping_cost ?? 0),
        total_amount: Number(
          order.total_amount ??
            (Number(order.subtotal ?? prev.subtotal ?? 0) +
              Number(order.shipping_cost ?? prev.shipping_cost ?? 0))
        ),
        n_items: itemCount,
        order_date: orderDate,
        product_category:
          typeof ml.product_category === "string"
            ? ml.product_category
            : prev.product_category,
        estimated_delivery_days: Number(
          ml.estimated_delivery_days ?? prev.estimated_delivery_days ?? 7
        ),
        avg_product_weight: Number(
          ml.avg_product_weight ?? prev.avg_product_weight ?? 1
        ),
        avg_photos: Number(ml.avg_photos ?? prev.avg_photos ?? 1),
        avg_desc_length: Number(
          ml.avg_desc_length ?? prev.avg_desc_length ?? 500
        ),
        avg_name_length: Number(
          ml.avg_name_length ?? prev.avg_name_length ?? 30
        ),
        avg_volume: Number(ml.avg_volume ?? prev.avg_volume ?? 10000),
        seller_customer_same_state:
          ml.seller_customer_same_state === 0 || ml.seller_customer_same_state === 1
            ? ml.seller_customer_same_state
            : prev.seller_customer_same_state,
        n_sellers: Number(ml.n_sellers ?? prev.n_sellers ?? 1),
      }));
    } catch {
      setError(t("ai.existing_order_load_failed"));
    } finally {
      setExistingOrderLoading(false);
    }
  };

  const updateOrderDateParts = (datePart: string, timePart: string) => {
    if (!datePart) {
      update("order_date", "");
      return;
    }
    update("order_date", `${datePart}T${timePart || DEFAULT_ORDER_TIME}`);
  };

  const validate = (): string | null => {
    if ((form.subtotal ?? 0) < 0 || (form.shipping_cost ?? 0) < 0) {
      return t("ai.validation_non_negative");
    }
    if ((form.n_items ?? 0) < 1 || (form.n_sellers ?? 0) < 1) {
      return t("ai.validation_min_one");
    }
    if ((form.estimated_delivery_days ?? 0) < 1) {
      return t("ai.validation_delivery_days");
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== undefined && value !== "")
    ) as OrderRiskRequest;
    onSubmit(payload);
  };

  return (
    <AiCard title={t("ai.order_details")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-muted-foreground">{t("ai.risk_form_focus_note")}</p>

        <div className="rounded-lg border border-border p-3 space-y-3">
          <Select
            label={t("ai.existing_order_source_label")}
            value={selectedExistingOrderId}
            options={existingOrderOptions}
            onChange={(e) => setSelectedExistingOrderId(e.target.value)}
            placeholder={t("ai.existing_order_select")}
            hint={ordersLoading ? t("ai.existing_order_loading") : t("ai.existing_order_hint")}
          />
          <Button
            type="button"
            variant="outline"
            isLoading={existingOrderLoading}
            disabled={!selectedExistingOrderId || existingOrderLoading}
            onClick={applyExistingOrder}
          >
            {t("ai.existing_order_load")}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2 md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CalendarPopover
                label={t("ai.order_date")}
                value={orderDateParts.date}
                locale={locale}
                placeholder={t("ai.order_date_select")}
                hint={t("ai.order_date_hint")}
                onChange={(nextDate) => updateOrderDateParts(nextDate, orderDateParts.time)}
              />
              <Select
                label={t("ai.order_time")}
                value={orderDateParts.time}
                options={ORDER_TIME_OPTIONS}
                onChange={(e) => {
                  const datePart = orderDateParts.date || toLocalDateTimeValue(new Date()).slice(0, 10);
                  updateOrderDateParts(datePart, e.target.value);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => applyOrderDatePreset("now")}>
                {t("ai.order_date_now")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyOrderDatePreset("minus_1h")}>
                {t("ai.order_date_minus_1h")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyOrderDatePreset("yesterday")}>
                {t("ai.order_date_yesterday")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyOrderDatePreset("clear")}>
                {t("ai.order_date_clear")}
              </Button>
            </div>
          </div>

          <Input label={t("ai.subtotal")} type="number" value={form.subtotal} onChange={(e) => update("subtotal", e.target.value)} />
          <Input label={t("ai.shipping_cost")} type="number" value={form.shipping_cost} onChange={(e) => update("shipping_cost", e.target.value)} />
          <Input
            label={`${t("ai.total_amount")} (DZD)`}
            type="number"
            value={form.total_amount}
            hint={t("ai.total_amount_hint")}
            onChange={(e) => update("total_amount", e.target.value)}
          />
          <Input label={t("ai.n_items")} type="number" min={1} value={form.n_items} onChange={(e) => update("n_items", e.target.value)} />

          <Input
            label={t("ai.product_category")}
            value={form.product_category ?? ""}
            list="risk-product-category-options"
            hint={
              categoriesLoading
                ? t("loading")
                : categoryOptions.length > 0
                  ? t("ai.product_category_hint")
                  : t("ai.product_category_manual_hint")
            }
            onChange={(e) => update("product_category", e.target.value)}
          />
          <Select label={t("ai.wilaya_id")} value={form.wilaya_id !== undefined ? String(form.wilaya_id) : ""} options={wilayaOptions} onChange={(e) => update("wilaya_id", e.target.value)} />
        </div>

        {categoryOptions.length > 0 && (
          <datalist id="risk-product-category-options">
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        )}

        {form.customer_state && (
          <p className="text-xs text-muted-foreground">
            {t("ai.customer_state_auto")}: {form.customer_state}
          </p>
        )}

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("ai.customer_info")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label={t("ai.estimated_delivery_days")} type="number" min={1} value={form.estimated_delivery_days} onChange={(e) => update("estimated_delivery_days", e.target.value)} />
            <Input label={t("ai.avg_product_weight")} type="number" min={0} step={0.1} value={form.avg_product_weight} onChange={(e) => update("avg_product_weight", e.target.value)} />
            <Input label={t("ai.n_sellers")} type="number" min={1} value={form.n_sellers} onChange={(e) => update("n_sellers", e.target.value)} />
            <Select
              label={t("ai.seller_customer_same_state")}
              value={form.seller_customer_same_state !== undefined ? String(form.seller_customer_same_state) : ""}
              options={binaryOptions}
              onChange={(e) => update("seller_customer_same_state", e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">{t("ai.product_quality")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label={t("ai.avg_photos")} type="number" min={0} step={1} value={form.avg_photos} onChange={(e) => update("avg_photos", e.target.value)} />
            <Input label={t("ai.avg_desc_length")} type="number" min={0} value={form.avg_desc_length} onChange={(e) => update("avg_desc_length", e.target.value)} />
            <Input label={t("ai.avg_name_length")} type="number" min={0} value={form.avg_name_length} onChange={(e) => update("avg_name_length", e.target.value)} />
            <Input label={t("ai.avg_volume")} type="number" min={0} value={form.avg_volume} onChange={(e) => update("avg_volume", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
          {t("ai.predict_risk")}
        </Button>
      </form>
    </AiCard>
  );
}
