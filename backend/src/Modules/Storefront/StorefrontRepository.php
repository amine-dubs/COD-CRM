<?php

declare(strict_types=1);

namespace App\Modules\Storefront;

use App\Core\Database;

class StorefrontRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Find active store by slug
     */
    public function findStoreBySlug(string $slug): ?array
    {
        return $this->db->queryOne(
            "SELECT id, name, slug, phone, email, logo_url, description, status 
             FROM stores 
             WHERE slug = ? AND status = 'active' 
             LIMIT 1",
            [$slug]
        );
    }

    /**
     * Get active products for a store
     */
    public function getActiveProducts(int $storeId): array
    {
        return $this->db->query(
            "SELECT p.id, p.name, p.description, p.price, p.sku, p.category, 
                    p.image_url, p.status,
                    COALESCE(i.quantity, 0) as stock_quantity
             FROM products p
             LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = p.store_id
             WHERE p.store_id = ? AND p.status = 'active'
             ORDER BY p.name ASC",
            [$storeId]
        );
    }

    /**
     * Get a specific product by ID for a store
     */
    public function findProductById(int $productId, int $storeId): ?array
    {
        return $this->db->queryOne(
            "SELECT id, name, price, status 
             FROM products 
             WHERE id = ? AND store_id = ? AND status = 'active'",
            [$productId, $storeId]
        );
    }
}
