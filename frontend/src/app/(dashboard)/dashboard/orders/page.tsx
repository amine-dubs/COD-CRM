"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/providers/i18n-provider";
import apiClient from "@/lib/api/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, Trash2, Pencil, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants/statuses";
import { WILAYAS } from "@/lib/constants/wilayas";
import type { Order, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";
import type { PaginationMeta } from "@/types";

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    wilaya_id: "",
    commune: "",
    address: "",
    notes: "",
  });
  const [items, setItems] = useState<{ product_id: string; quantity: string; price: string }[]>([
    { product_id: "", quantity: "1", price: "" },
  ]);

  // Delete state
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status update modal
  const [showStatus, setShowStatus] = useState(false);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "15");
      params.set("sort", sortKey);
      params.set("direction", sortDir);
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await apiClient.get(`/orders?${params.toString()}`);
      setOrders(res.data.data);
      setMeta(res.data.meta);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Create / Edit Modal ────────────────────────────

  const loadProducts = async () => {
    try {
      const res = await apiClient.get("/products?per_page=100");
      setProducts(res.data.data || []);
    } catch {
      setProducts([]);
    }
  };

  const openCreateModal = async () => {
    setEditingOrder(null);
    setForm({ customer_name: "", customer_phone: "", wilaya_id: "", commune: "", address: "", notes: "" });
    setItems([{ product_id: "", quantity: "1", price: "" }]);
    setFormErrors({});
    setShowModal(true);
    await loadProducts();
  };

  const openEditModal = async (order: Order) => {
    setEditingOrder(order);
    setForm({
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      wilaya_id: order.wilaya_id ? String(order.wilaya_id) : "",
      commune: order.commune || "",
      address: order.address || "",
      notes: order.notes || "",
    });
    setItems(
      order.items && order.items.length > 0
        ? order.items.map((i) => ({
            product_id: i.product_id ? String(i.product_id) : "",
            quantity: String(i.quantity),
            price: String(i.price),
          }))
        : [{ product_id: "", quantity: "1", price: "" }]
    );
    setFormErrors({});
    setShowModal(true);
    await loadProducts();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOrder(null);
    setForm({ customer_name: "", customer_phone: "", wilaya_id: "", commune: "", address: "", notes: "" });
    setItems([{ product_id: "", quantity: "1", price: "" }]);
    setFormErrors({});
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "product_id" && value) {
        const product = products.find((p) => String(p.id) === value);
        if (product) updated[idx].price = String(product.price);
      }
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { product_id: "", quantity: "1", price: "" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!form.customer_name.trim()) errors.customer_name = t("orders.error_name_required");
    if (!form.customer_phone.trim()) errors.customer_phone = t("orders.error_phone_required");
    if (!form.wilaya_id) errors.wilaya_id = t("orders.error_wilaya_required");
    if (!form.commune.trim()) errors.commune = t("orders.error_commune_required");
    if (!form.address.trim()) errors.address = t("orders.error_address_required");
    const validItems = items.filter((i) => i.product_id && i.quantity && i.price);
    if (validItems.length === 0) errors.items = t("orders.error_items_required");
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      wilaya_id: parseInt(form.wilaya_id),
      commune: form.commune.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      items: validItems.map((i) => ({
        product_id: parseInt(i.product_id),
        quantity: parseInt(i.quantity),
        price: parseFloat(i.price),
      })),
    };

    setSaving(true);
    try {
      if (editingOrder) {
        await apiClient.put(`/orders/${editingOrder.id}`, payload);
      } else {
        await apiClient.post("/orders", payload);
      }
      closeModal();
      fetchOrders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t(editingOrder ? "orders.error_update" : "orders.error_create");
      setFormErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteOrder) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/orders/${deleteOrder.id}`);
      setDeleteOrder(null);
      fetchOrders();
    } catch {
      // handle error
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Status Update ──────────────────────────────────

  const openStatusUpdate = (order: Order) => {
    setStatusOrder(order);
    setNewStatus(order.status);
    setStatusMsg("");
    setShowStatus(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusOrder || !newStatus) return;
    setUpdatingStatus(true);
    setStatusMsg("");
    try {
      await apiClient.patch(`/orders/${statusOrder.id}/status`, { status: newStatus });
      setStatusMsg(t("orders.success_status"));
      fetchOrders();
      setTimeout(() => setShowStatus(false), 1000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("errors.generic");
      setStatusMsg("✗ " + msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Options ────────────────────────────────────────

  const statusOptions = Object.entries(ORDER_STATUSES).map(([key, val]) => ({
    value: key,
    label: val.label[locale as "en" | "fr" | "ar"] || val.label.en,
  }));

  const wilayaOptions = WILAYAS.map((w) => ({
    value: String(w.id),
    label: locale === "ar" ? `${w.code} - ${w.ar_name}` : `${w.code} - ${w.name}`,
  }));

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.name} — ${p.price} DA`,
  }));

  const columns: Column<Order>[] = [
    { key: "reference", header: t("orders.reference"), sortable: true },
    { key: "customer_name", header: t("orders.customer_name"), sortable: true },
    { key: "customer_phone", header: t("orders.customer_phone") },
    { key: "wilaya", header: t("orders.wilaya"), render: (o) => o.wilaya_name || "—" },
    {
      key: "total_amount",
      header: t("orders.total"),
      sortable: true,
      render: (order) => formatCurrency(order.total_amount),
    },
    {
      key: "status",
      header: t("status"),
      render: (order) => (
        <StatusBadge
          status={order.status as OrderStatus}
          locale={locale as "en" | "fr" | "ar"}
        />
      ),
    },
    {
      key: "created_at",
      header: t("orders.created_at"),
      sortable: true,
      render: (order) => formatDate(order.created_at),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-28",
      render: (order) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openStatusUpdate(order); }} title={t("orders.update_status")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditModal(order); }} title={t("edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteOrder(order); }} title={t("delete")}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("orders.title")}
        </h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          {t("orders.new_order")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <Select
          options={[{ value: "", label: t("filter") + ": " + t("status") }, ...statusOptions]}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage={t("no_results")}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={handleSort}
        rowKey={(order) => order.id}
      />

      {/* Pagination */}
      {meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("showing_results", {
              from: (meta.page - 1) * meta.per_page + 1,
              to: Math.min(meta.page * meta.per_page, meta.total),
              total: meta.total,
            })}
          </p>
          <Pagination
            currentPage={meta.page}
            totalPages={meta.total_pages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create/Edit Order Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingOrder ? t("orders.edit_order") : t("orders.new_order")}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("orders.customer_name") + " *"} name="customer_name" value={form.customer_name} onChange={handleFormChange} error={formErrors.customer_name} />
            <Input label={t("orders.customer_phone") + " *"} name="customer_phone" value={form.customer_phone} onChange={handleFormChange} error={formErrors.customer_phone} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t("orders.wilaya") + " *"} name="wilaya_id" value={form.wilaya_id} onChange={handleFormChange} options={wilayaOptions} placeholder={t("orders.select_wilaya")} error={formErrors.wilaya_id} />
            <Input label={t("orders.commune") + " *"} name="commune" value={form.commune} onChange={handleFormChange} error={formErrors.commune} />
          </div>
          <Input label={t("orders.address") + " *"} name="address" value={form.address} onChange={handleFormChange} error={formErrors.address} />

          {/* Order Items */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("orders.items")} *</label>
            {formErrors.items && <p className="text-xs text-destructive mb-2">{formErrors.items}</p>}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select options={productOptions} placeholder={t("orders.select_product")} value={item.product_id} onChange={(e) => handleItemChange(idx, "product_id", e.target.value)} />
                  </div>
                  <div className="w-20">
                    <Input type="number" placeholder={t("orders.quantity")} value={item.quantity} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} min="1" />
                  </div>
                  <div className="w-28">
                    <Input type="number" placeholder={t("orders.price")} value={item.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)} />
                  </div>
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
              <Plus className="h-4 w-4" /> {t("orders.add_product")}
            </Button>
          </div>

          <Textarea label={t("orders.notes")} name="notes" value={form.notes} onChange={handleFormChange} />

          {formErrors.submit && <p className="text-sm text-destructive">{formErrors.submit}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} isLoading={saving}>
              {editingOrder ? t("orders.update_order") : t("orders.create_order")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
        onConfirm={handleDelete}
        title={t("orders.delete_order")}
        message={t("orders.delete_confirm")}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        isLoading={isDeleting}
      />

      {/* Update Status Modal */}
      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title={t("orders.update_status")} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {statusOrder?.reference} — {statusOrder?.customer_name}
          </p>
          <Select
            label={t("status")}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={statusOptions}
          />
          {statusMsg && (
            <p className={`text-sm ${statusMsg.startsWith("✗") ? "text-destructive" : "text-green-600"}`}>
              {statusMsg}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowStatus(false)}>{t("cancel")}</Button>
            <Button onClick={handleStatusUpdate} isLoading={updatingStatus}>{t("confirm")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
