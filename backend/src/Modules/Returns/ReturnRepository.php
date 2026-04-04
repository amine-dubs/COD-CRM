<?php

declare(strict_types=1);

namespace App\Modules\Returns;

use App\Core\Database;

class ReturnRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id, int $storeId): ?array
    {
        return $this->db->queryOne(
            'SELECT r.*, o.reference as order_reference, o.customer_name, o.customer_phone,
                    w.name as wilaya_name
             FROM returns r
             LEFT JOIN orders o ON r.order_id = o.id
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             WHERE r.id = ? AND r.store_id = ?',
            [$id, $storeId]
        );
    }

    public function paginate(int $storeId, int $page, int $perPage, array $filters): array
    {
        $where = 'r.store_id = ?';
        $params = [$storeId];

        if (!empty($filters['status'])) {
            $where .= ' AND r.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['reason'])) {
            $where .= ' AND r.reason = ?';
            $params[] = $filters['reason'];
        }

        $total = $this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM returns r WHERE {$where}",
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT r.*, o.reference as order_reference, o.customer_name
             FROM returns r
             LEFT JOIN orders o ON r.order_id = o.id
             WHERE {$where}
             ORDER BY r.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => (int)$total];
    }

    public function update(int $id, int $storeId, array $data): int
    {
        return $this->db->update('returns', $data, 'id = ? AND store_id = ?', [$id, $storeId]);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->db->delete('returns', 'id = ? AND store_id = ?', [$id, $storeId]) > 0;
    }
}
