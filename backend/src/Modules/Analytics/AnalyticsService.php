<?php

declare(strict_types=1);

namespace App\Modules\Analytics;

use App\Core\Database;

class AnalyticsService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function getDashboardStats(int $storeId, string $period): array
    {
        $dateFrom = $this->periodToDate($period);

        return [
            'total_orders'     => $this->countOrders($storeId, $dateFrom),
            'total_revenue'    => $this->totalRevenue($storeId, $dateFrom),
            'total_products'   => $this->countProducts($storeId),
            'total_users'      => $this->countUsers($storeId),
            'pending_orders'   => $this->countPendingOrders($storeId),
            'delivery_rate'    => $this->deliveryRate($storeId, $dateFrom),
            'return_rate'      => $this->returnRate($storeId, $dateFrom),
            'confirmation_rate' => $this->confirmationRate($storeId, $dateFrom),
            'average_order_value' => $this->avgOrderValue($storeId, $dateFrom),
            'orders_by_status' => $this->ordersByStatus($storeId, $dateFrom),
            'new_orders_today' => $this->countOrders($storeId, date('Y-m-d')),
        ];
    }

    public function getOrderAnalytics(int $storeId, string $period): array
    {
        $dateFrom = $this->periodToDate($period);

        return [
            'by_status'  => $this->ordersByStatus($storeId, $dateFrom),
            'by_day'     => $this->ordersByDay($storeId, $dateFrom),
            'avg_confirmation_time' => $this->avgConfirmationTime($storeId, $dateFrom),
        ];
    }

    public function getWilayaAnalytics(int $storeId, string $period): array
    {
        $dateFrom = $this->periodToDate($period);

        return $this->db->query(
            "SELECT w.id as wilaya_id, w.name as wilaya_name, w.ar_name as wilaya_ar_name,
                    COUNT(o.id) as total_orders,
                    SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                    SUM(CASE WHEN o.status = 'returned' THEN 1 ELSE 0 END) as returned_count,
                    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as revenue,
                    ROUND(
                        SUM(CASE WHEN o.status = 'returned' THEN 1 ELSE 0 END) * 100.0 /
                        NULLIF(COUNT(o.id), 0), 2
                    ) as return_rate
             FROM wilayas w
             LEFT JOIN orders o ON o.wilaya_id = w.id AND o.store_id = ? AND o.created_at >= ?
             GROUP BY w.id, w.name, w.ar_name
             HAVING total_orders > 0
             ORDER BY total_orders DESC",
            [$storeId, $dateFrom]
        );
    }

    public function getTopProducts(int $storeId, string $period, int $limit): array
    {
        $dateFrom = $this->periodToDate($period);

        return $this->db->query(
            "SELECT p.id, p.name, p.sku, p.price,
                    SUM(oi.quantity) as total_sold,
                    SUM(oi.total) as total_revenue,
                    COUNT(DISTINCT o.id) as order_count
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id AND o.store_id = ?
             JOIN products p ON oi.product_id = p.id
             WHERE o.created_at >= ? AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
             GROUP BY p.id, p.name, p.sku, p.price
             ORDER BY total_sold DESC
             LIMIT ?",
            [$storeId, $dateFrom, $limit]
        );
    }

    public function getReturnAnalytics(int $storeId, string $period): array
    {
        $dateFrom = $this->periodToDate($period);

        return [
            'total_returns'   => $this->countByStatus($storeId, 'returned', $dateFrom),
            'return_rate'     => $this->returnRate($storeId, $dateFrom),
            'by_wilaya'       => $this->returnsByWilaya($storeId, $dateFrom),
            'by_reason'       => $this->returnsByReason($storeId, $dateFrom),
        ];
    }

    public function getRevenueTimeline(int $storeId, string $period, string $groupBy): array
    {
        $dateFrom = $this->periodToDate($period);

        $dateFormat = match ($groupBy) {
            'week'  => '%Y-%u',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        return $this->db->query(
            "SELECT DATE_FORMAT(o.created_at, ?) as period,
                    COUNT(*) as order_count,
                    SUM(o.total_amount) as revenue,
                    SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as collected_revenue,
                    COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.store_id = ? AND o.created_at >= ?
             GROUP BY period
             ORDER BY period ASC",
            [$dateFormat, $storeId, $dateFrom]
        );
    }

    // ── Private Helpers ───────────────────────────────────

    private function periodToDate(string $period): string
    {
        return match ($period) {
            '7d'  => date('Y-m-d', strtotime('-7 days')),
            '30d' => date('Y-m-d', strtotime('-30 days')),
            '90d' => date('Y-m-d', strtotime('-90 days')),
            '12m' => date('Y-m-d', strtotime('-12 months')),
            default => date('Y-m-d', strtotime('-30 days')),
        };
    }

    private function countOrders(int $storeId, string $dateFrom): int
    {
        return (int)$this->db->queryOne(
            'SELECT COUNT(*) as cnt FROM orders WHERE store_id = ? AND created_at >= ?',
            [$storeId, $dateFrom]
        )['cnt'];
    }

    private function countProducts(int $storeId): int
    {
        return (int)$this->db->queryOne(
            'SELECT COUNT(*) as cnt FROM products WHERE store_id = ?',
            [$storeId]
        )['cnt'];
    }

    private function countUsers(int $storeId): int
    {
        return (int)$this->db->queryOne(
            'SELECT COUNT(*) as cnt FROM users WHERE store_id = ?',
            [$storeId]
        )['cnt'];
    }

    private function countPendingOrders(int $storeId): int
    {
        return (int)$this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM orders WHERE store_id = ? AND status IN ('new', 'no_answer', 'postponed')",
            [$storeId]
        )['cnt'];
    }

    private function totalRevenue(int $storeId, string $dateFrom): float
    {
        return (float)$this->db->queryOne(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
             WHERE store_id = ? AND status = 'delivered' AND created_at >= ?",
            [$storeId, $dateFrom]
        )['total'];
    }

    private function countByStatus(int $storeId, string $status, string $dateFrom): int
    {
        return (int)$this->db->queryOne(
            'SELECT COUNT(*) as cnt FROM orders WHERE store_id = ? AND status = ? AND created_at >= ?',
            [$storeId, $status, $dateFrom]
        )['cnt'];
    }

    private function deliveryRate(int $storeId, string $dateFrom): float
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered
             FROM orders WHERE store_id = ? AND created_at >= ?",
            [$storeId, $dateFrom]
        );
        return $row['total'] > 0 ? round(($row['delivered'] / $row['total']) * 100, 2) : 0;
    }

    private function returnRate(int $storeId, string $dateFrom): float
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
             FROM orders WHERE store_id = ? AND created_at >= ?",
            [$storeId, $dateFrom]
        );
        return $row['total'] > 0 ? round(($row['returned'] / $row['total']) * 100, 2) : 0;
    }

    private function confirmationRate(int $storeId, string $dateFrom): float
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status NOT IN ('new', 'no_answer', 'cancelled') THEN 1 ELSE 0 END) as confirmed
             FROM orders WHERE store_id = ? AND created_at >= ?",
            [$storeId, $dateFrom]
        );
        return $row['total'] > 0 ? round(($row['confirmed'] / $row['total']) * 100, 2) : 0;
    }

    private function avgOrderValue(int $storeId, string $dateFrom): float
    {
        return (float)$this->db->queryOne(
            'SELECT COALESCE(AVG(total_amount), 0) as avg_val FROM orders
             WHERE store_id = ? AND created_at >= ?',
            [$storeId, $dateFrom]
        )['avg_val'];
    }

    private function ordersByStatus(int $storeId, string $dateFrom): array
    {
        return $this->db->query(
            'SELECT status, COUNT(*) as count FROM orders
             WHERE store_id = ? AND created_at >= ?
             GROUP BY status ORDER BY count DESC',
            [$storeId, $dateFrom]
        );
    }

    private function ordersByDay(int $storeId, string $dateFrom): array
    {
        return $this->db->query(
            "SELECT DATE(created_at) as date, COUNT(*) as count
             FROM orders WHERE store_id = ? AND created_at >= ?
             GROUP BY DATE(created_at) ORDER BY date ASC",
            [$storeId, $dateFrom]
        );
    }

    private function avgConfirmationTime(int $storeId, string $dateFrom): ?float
    {
        $row = $this->db->queryOne(
            "SELECT AVG(TIMESTAMPDIFF(HOUR, o.created_at, h.created_at)) as avg_hours
             FROM orders o
             JOIN order_status_history h ON o.id = h.order_id AND h.status = 'confirmed'
             WHERE o.store_id = ? AND o.created_at >= ?",
            [$storeId, $dateFrom]
        );
        return $row['avg_hours'] ? round((float)$row['avg_hours'], 1) : null;
    }

    private function returnsByWilaya(int $storeId, string $dateFrom): array
    {
        return $this->db->query(
            "SELECT w.name as wilaya_name, COUNT(*) as return_count
             FROM orders o JOIN wilayas w ON o.wilaya_id = w.id
             WHERE o.store_id = ? AND o.status = 'returned' AND o.created_at >= ?
             GROUP BY w.id, w.name ORDER BY return_count DESC LIMIT 20",
            [$storeId, $dateFrom]
        );
    }

    private function returnsByReason(int $storeId, string $dateFrom): array
    {
        return $this->db->query(
            "SELECT r.reason, COUNT(*) as count
             FROM returns r
             WHERE r.store_id = ? AND r.created_at >= ?
             GROUP BY r.reason ORDER BY count DESC",
            [$storeId, $dateFrom]
        );
    }
}
