<?php

declare(strict_types=1);

namespace App\Modules\Store;

use App\Core\Database;

class StoreRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id): ?array
    {
        return $this->db->queryOne('SELECT * FROM stores WHERE id = ?', [$id]);
    }

    public function findBySlug(string $slug): ?array
    {
        return $this->db->queryOne('SELECT * FROM stores WHERE slug = ?', [$slug]);
    }

    public function update(int $id, array $data): int
    {
        return $this->db->update('stores', $data, 'id = ?', [$id]);
    }

    public function getStats(int $storeId): array
    {
        $db = $this->db;

        $totalOrders = $db->count('orders', 'store_id = ?', [$storeId]);
        $totalProducts = $db->count('products', 'store_id = ?', [$storeId]);
        $totalUsers = $db->count('users', 'store_id = ?', [$storeId]);

        $revenue = $db->queryOne(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE store_id = ? AND status = 'delivered'",
            [$storeId]
        );

        return [
            'total_orders'   => $totalOrders,
            'total_products' => $totalProducts,
            'total_users'    => $totalUsers,
            'total_revenue'  => (float)($revenue['total'] ?? 0),
        ];
    }
}
