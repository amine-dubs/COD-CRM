<?php

declare(strict_types=1);

namespace App\Modules\Order;

use App\Core\Database;

class OrderRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id, int $storeId): ?array
    {
        return $this->db->queryOne(
            'SELECT o.*, w.name as wilaya_name
             FROM orders o
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             WHERE o.id = ? AND o.store_id = ?',
            [$id, $storeId]
        );
    }

    public function getOrderItems(int $orderId): array
    {
        return $this->db->query(
            'SELECT oi.*, p.name as product_name, p.sku, p.category as product_category
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?',
            [$orderId]
        );
    }

    public function getCustomerProfileByPhone(int $storeId, string $phone): array
    {
        $row = $this->db->queryOne(
            'SELECT
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as total_spent,
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                MAX(created_at) as last_order_at
             FROM orders
             WHERE store_id = ? AND (customer_phone = ? OR customer_phone_2 = ?)',
            [$storeId, $phone, $phone]
        );

        return [
            'phone' => $phone,
            'order_count' => (int)($row['order_count'] ?? 0),
            'total_spent' => (float)($row['total_spent'] ?? 0),
            'avg_order_value' => (float)($row['avg_order_value'] ?? 0),
            'last_order_at' => $row['last_order_at'] ?? null,
        ];
    }

    public function getStatusHistory(int $orderId): array
    {
        return $this->db->query(
            'SELECT osh.*, u.name as changed_by_name
             FROM order_status_history osh
             LEFT JOIN users u ON osh.changed_by = u.id
             WHERE osh.order_id = ?
             ORDER BY osh.created_at ASC',
            [$orderId]
        );
    }

    public function paginate(
        int $storeId,
        int $page,
        int $perPage,
        array $filters,
        string $sort = 'created_at',
        string $direction = 'desc'
    ): array
    {
        $where = 'o.store_id = ?';
        $params = [$storeId];

        if (!empty($filters['status'])) {
            $where .= ' AND o.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['wilaya_id'])) {
            $where .= ' AND o.wilaya_id = ?';
            $params[] = (int)$filters['wilaya_id'];
        }

        if (!empty($filters['date_from'])) {
            $where .= ' AND o.created_at >= ?';
            $params[] = $filters['date_from'] . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $where .= ' AND o.created_at <= ?';
            $params[] = $filters['date_to'] . ' 23:59:59';
        }

        if (!empty($filters['search'])) {
            $where .= ' AND (o.reference LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)';
            $params[] = "%{$filters['search']}%";
            $params[] = "%{$filters['search']}%";
            $params[] = "%{$filters['search']}%";
        }

        $total = $this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM orders o WHERE {$where}",
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;

        $sortableColumns = [
            'reference' => 'o.reference',
            'customer_name' => 'o.customer_name',
            'total_amount' => 'o.total_amount',
            'status' => 'o.status',
            'created_at' => 'o.created_at',
        ];

        $sortColumn = $sortableColumns[$sort] ?? 'o.created_at';
        $sortDirection = strtolower($direction) === 'asc' ? 'ASC' : 'DESC';

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT o.*, w.name as wilaya_name
             FROM orders o
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             WHERE {$where}
             ORDER BY {$sortColumn} {$sortDirection}, o.id DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => (int)$total];
    }

    public function update(int $id, int $storeId, array $data): int
    {
        return $this->db->update('orders', $data, 'id = ? AND store_id = ?', [$id, $storeId]);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->db->delete('orders', 'id = ? AND store_id = ?', [$id, $storeId]) > 0;
    }
}
