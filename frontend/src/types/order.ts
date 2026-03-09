// ============================================================
// COD CRM — Order Types
// ============================================================

export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled"
  | "no_answer"
  | "postponed";

export interface Order {
  id: number;
  store_id: number;
  reference: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_2: string | null;
  wilaya_id: number | null;
  wilaya_name: string | null;
  commune: string | null;
  address: string | null;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total_amount: number;
  status: OrderStatus;
  attempt_count: number;
  notes: string | null;
  internal_notes: string | null;
  source: string;
  created_by: number | null;
  confirmed_by: number | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string | null;
  sku: string | null;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  status: string;
  note: string | null;
  changed_by: number | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_phone_2?: string;
  wilaya_id: number;
  commune: string;
  address: string;
  shipping_cost?: number;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
    price: number;
  }[];
}

export interface OrderFilters {
  status?: OrderStatus;
  wilaya_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}
