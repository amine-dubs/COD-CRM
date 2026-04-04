<?php

declare(strict_types=1);

namespace App\Modules\Inventory;

use App\Core\Database;

class InventoryRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function getStock(int $storeId, int $productId): ?array
    {
        return $this->db->queryOne(
            'SELECT * FROM inventory WHERE store_id = ? AND product_id = ?',
            [$storeId, $productId]
        );
    }

    public function createStock(int $storeId, int $productId, int $quantity): int
    {
        return $this->db->insert('inventory', [
            'store_id'   => $storeId,
            'product_id' => $productId,
            'quantity'    => $quantity,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function updateStock(int $storeId, int $productId, int $quantity): int
    {
        return $this->db->update(
            'inventory',
            ['quantity' => $quantity, 'updated_at' => date('Y-m-d H:i:s')],
            'store_id = ? AND product_id = ?',
            [$storeId, $productId]
        );
    }

    public function getMovements(int $storeId, int $productId): array
    {
        return $this->db->query(
            'SELECT im.*, u.name as performed_by_name
             FROM inventory_movements im
             LEFT JOIN users u ON im.performed_by = u.id
             WHERE im.store_id = ? AND im.product_id = ?
             ORDER BY im.created_at DESC
             LIMIT 100',
            [$storeId, $productId]
        );
    }

    public function getLowStock(int $storeId, int $threshold): array
    {
        return $this->db->query(
            'SELECT p.id, p.name, p.sku, COALESCE(i.quantity, 0) as stock_quantity
             FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE p.store_id = ? AND p.status = ? AND COALESCE(i.quantity, 0) <= ?
             ORDER BY COALESCE(i.quantity, 0) ASC',
            [$storeId, 'active', $threshold]
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

        if (!empty($filters['low_stock'])) {
            $where .= ' AND COALESCE(i.quantity, 0) <= 10';
        }

        $total = $this->db->queryOne(
            "SELECT COUNT(*) as cnt FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE {$where}",
            $params
        )['cnt'];

        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT p.id, p.name, p.sku, p.price, p.category, p.status,
                    COALESCE(i.quantity, 0) as stock_quantity, i.updated_at as stock_updated_at
             FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE {$where}
             ORDER BY p.name ASC
             LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => (int)$total];
    }
}
