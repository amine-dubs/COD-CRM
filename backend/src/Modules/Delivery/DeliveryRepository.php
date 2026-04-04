<?php

declare(strict_types=1);

namespace App\Modules\Delivery;

use App\Core\Database;

class DeliveryRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id, int $storeId): ?array
    {
        return $this->db->queryOne(
            'SELECT d.*, o.reference as order_reference, o.customer_name, o.customer_phone,
                    w.name as wilaya_name
             FROM deliveries d
             LEFT JOIN orders o ON d.order_id = o.id
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             WHERE d.id = ? AND d.store_id = ?',
            [$id, $storeId]
        );
    }

    public function paginate(int $storeId, int $page, int $perPage, array $filters): array
    {
        $where = 'd.store_id = ?';
        $params = [$storeId];

        if (!empty($filters['status'])) {
            $where .= ' AND d.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['partner'])) {
            $where .= ' AND d.delivery_partner = ?';
            $params[] = $filters['partner'];
        }

        if (!empty($filters['wilaya_id'])) {
            $where .= ' AND o.wilaya_id = ?';
            $params[] = (int)$filters['wilaya_id'];
        }

        if (!empty($filters['date_from'])) {
            $where .= ' AND d.created_at >= ?';
            $params[] = $filters['date_from'] . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $where .= ' AND d.created_at <= ?';
            $params[] = $filters['date_to'] . ' 23:59:59';
        }

        $total = $this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM deliveries d
             LEFT JOIN orders o ON d.order_id = o.id
             WHERE {$where}",
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT d.*, o.reference as order_reference, o.customer_name, w.name as wilaya_name
             FROM deliveries d
             LEFT JOIN orders o ON d.order_id = o.id
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             WHERE {$where}
             ORDER BY d.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => (int)$total];
    }

    public function update(int $id, int $storeId, array $data): int
    {
        return $this->db->update('deliveries', $data, 'id = ? AND store_id = ?', [$id, $storeId]);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->db->delete('deliveries', 'id = ? AND store_id = ?', [$id, $storeId]) > 0;
    }
}
