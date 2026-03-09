"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/providers/i18n-provider";
import apiClient from "@/lib/api/client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/product";
import type { PaginationMeta } from "@/types";

export default function ProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Create/Edit product modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    cost_price: "",
    weight: "",
    category: "",
    image_url: "",
  });

  // Delete state
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "15");
      if (search) params.set("search", search);

      const res = await apiClient.get(`/products?${params.toString()}`);
      setProducts(res.data.data);
      setMeta(res.data.meta);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProductForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm({ name: "", sku: "", description: "", price: "", cost_price: "", weight: "", category: "", image_url: "" });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      price: product.price ? String(product.price) : "",
      cost_price: product.cost_price ? String(product.cost_price) : "",
      weight: product.weight ? String(product.weight) : "",
      category: product.category || "",
      image_url: product.image_url || "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setProductForm({ name: "", sku: "", description: "", price: "", cost_price: "", weight: "", category: "", image_url: "" });
    setFormErrors({});
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!productForm.name.trim()) errors.name = t("products.error_name_required");
    if (!productForm.price || isNaN(Number(productForm.price))) errors.price = t("products.error_price_required");
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || undefined,
      description: productForm.description.trim() || undefined,
      price: parseFloat(productForm.price),
      cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : undefined,
      weight: productForm.weight ? parseFloat(productForm.weight) : undefined,
      category: productForm.category.trim() || undefined,
      image_url: productForm.image_url.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, payload);
      } else {
        await apiClient.post("/products", payload);
      }
      closeModal();
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t(editingProduct ? "products.error_update" : "products.error_create");
      setFormErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/products/${deleteProduct.id}`);
      setDeleteProduct(null);
      fetchProducts();
    } catch {
      // handle error
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "image_url",
      header: "",
      className: "w-12",
      render: (p) =>
        p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted" />
        ),
    },
    { key: "name", header: t("products.name") },
    { key: "sku", header: t("products.sku") },
    {
      key: "price",
      header: t("products.price"),
      render: (p) => formatCurrency(p.price),
    },
    {
      key: "cost_price",
      header: t("products.cost_price"),
      render: (p) => (p.cost_price ? formatCurrency(p.cost_price) : "—"),
    },
    {
      key: "stock_quantity",
      header: t("products.stock"),
      render: (p) => (
        <span
          className={
            (p.stock_quantity ?? 0) <= 10
              ? "font-medium text-destructive"
              : ""
          }
        >
          {p.stock_quantity ?? "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-20",
      render: (p) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditModal(p); }} title={t("edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteProduct(p); }} title={t("delete")}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("products.title")}
        </h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          {t("products.new_product")}
        </Button>
      </div>

      <div className="relative max-w-md">
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

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage={t("no_results")}
        rowKey={(p) => p.id}
      />

      {meta && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.total_pages}
          onPageChange={setPage}
        />
      )}

      {/* Create/Edit Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingProduct ? t("products.edit_product") : t("products.new_product")}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label={t("products.name") + " *"} name="name" value={productForm.name} onChange={handleFormChange} error={formErrors.name} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("products.price_da") + " *"} name="price" type="number" value={productForm.price} onChange={handleFormChange} error={formErrors.price} />
            <Input label={t("products.cost_price_da")} name="cost_price" type="number" value={productForm.cost_price} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("products.sku")} name="sku" value={productForm.sku} onChange={handleFormChange} />
            <Input label={t("products.category")} name="category" value={productForm.category} onChange={handleFormChange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("products.weight_kg")} name="weight" type="number" value={productForm.weight} onChange={handleFormChange} />
            <Input label={t("products.image_url")} name="image_url" value={productForm.image_url} onChange={handleFormChange} />
          </div>
          <Textarea label={t("products.description")} name="description" value={productForm.description} onChange={handleFormChange} />

          {formErrors.submit && <p className="text-sm text-destructive">{formErrors.submit}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal}>{t("cancel")}</Button>
            <Button onClick={handleSubmit} isLoading={saving}>
              {editingProduct ? t("products.update_product") : t("products.create_product")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        title={t("products.delete_product")}
        message={t("products.delete_confirm")}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        isLoading={isDeleting}
      />
    </div>
  );
}
