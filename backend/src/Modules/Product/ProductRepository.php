<?php

declare(strict_types=1);

namespace App\Modules\Product;

use App\Core\Database;

class ProductRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id, int $storeId): ?array
    {
        return $this->db->queryOne(
            'SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
             FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE p.id = ? AND p.store_id = ?',
            [$id, $storeId]
        );
    }

    public function paginate(int $storeId, int $page, int $perPage, array $filters): array
    {
        $where = 'p.store_id = ?';
        $params = [$storeId];

        if (!empty($filters['search'])) {
            $where .= ' AND (p.name LIKE ? OR p.sku LIKE ?)';
            $params[] = "%{$filters['search']}%";
            $params[] = "%{$filters['search']}%";
        }

        if (!empty($filters['status'])) {
            $where .= ' AND p.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['category'])) {
            $where .= ' AND p.category = ?';
            $params[] = $filters['category'];
        }

        $total = $this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM products p WHERE {$where}",
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
             FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE {$where}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => (int)$total];
    }

    public function create(array $data): int
    {
        return $this->db->insert('products', $data);
    }

    public function update(int $id, int $storeId, array $data): int
    {
        return $this->db->update('products', $data, 'id = ? AND store_id = ?', [$id, $storeId]);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->db->delete('products', 'id = ? AND store_id = ?', [$id, $storeId]) > 0;
    }
}
