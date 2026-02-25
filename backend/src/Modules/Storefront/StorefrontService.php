<?php

declare(strict_types=1);

namespace App\Modules\Storefront;

use App\Core\Database;

class StorefrontService
{
    private StorefrontRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new StorefrontRepository();
        $this->db = Database::getInstance();
    }

    /**
     * Get public store info
     */
    public function getStoreBySlug(string $slug): ?array
    {
        return $this->repo->findStoreBySlug($slug);
    }

    /**
     * Get active products for a store (by slug)
     */
    public function getProducts(string $slug): ?array
    {
        $store = $this->repo->findStoreBySlug($slug);
        if (!$store) {
            return null;
        }

        return $this->repo->getActiveProducts((int) $store['id']);
    }

    /**
     * Place a public order from the storefront
     */
    public function placeOrder(string $slug, array $data): array
    {
        $store = $this->repo->findStoreBySlug($slug);
        if (!$store) {
            throw new \Exception('Store not found', 404);
        }

        $storeId = (int) $store['id'];

        // Validate items and calculate totals
        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new \Exception('At least one item is required', 422);
        }

        $subtotal = 0;
        $validatedItems = [];

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $quantity = (int) ($item['quantity'] ?? 1);

            if ($productId <= 0 || $quantity <= 0) {
                throw new \Exception('Invalid product or quantity', 422);
            }

            $product = $this->repo->findProductById($productId, $storeId);
            if (!$product) {
                throw new \Exception("Product #{$productId} not found or not available", 422);
            }

            $price = (float) $product['price'];
            $subtotal += $price * $quantity;

            $validatedItems[] = [
                'product_id' => $productId,
                'quantity'   => $quantity,
                'price'      => $price,
                'total'      => $price * $quantity,
            ];
        }

        $shippingCost = (float) ($data['shipping_cost'] ?? 0);
        $totalAmount = $subtotal + $shippingCost;

        // Generate order reference
        $reference = $this->generateReference($storeId);

        $this->db->beginTransaction();

        try {
            $orderId = $this->db->insert('orders', [
                'store_id'       => $storeId,
                'reference'      => $reference,
                'customer_name'  => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'customer_phone_2' => $data['customer_phone_2'] ?? null,
                'wilaya_id'      => (int) $data['wilaya_id'],
                'commune'        => $data['commune'],
                'address'        => $data['address'],
                'subtotal'       => $subtotal,
                'shipping_cost'  => $shippingCost,
                'total_amount'   => $totalAmount,
                'status'         => 'new',
                'source'         => 'storefront',
                'notes'          => $data['notes'] ?? null,
                'created_by'     => null, // Public order — no user
                'created_at'     => date('Y-m-d H:i:s'),
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);

            // Insert order items
            foreach ($validatedItems as $item) {
                $this->db->insert('order_items', [
                    'order_id'   => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                    'total'      => $item['total'],
                ]);
            }

            // Insert initial status history
            $this->db->insert('order_status_history', [
                'order_id'   => $orderId,
                'old_status' => null,
                'new_status' => 'new',
                'changed_by' => null,
                'notes'      => 'Order placed from storefront',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();

            return [
                'id'             => $orderId,
                'reference'      => $reference,
                'customer_name'  => $data['customer_name'],
                'total_amount'   => $totalAmount,
                'status'         => 'new',
                'items_count'    => count($validatedItems),
            ];
        } catch (\Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    private function generateReference(int $storeId): string
    {
        $prefix = 'SF'; // StoreFront order
        $date = date('ymd');
        $random = strtoupper(substr(md5((string) mt_rand()), 0, 4));
        return "{$prefix}-{$storeId}-{$date}-{$random}";
    }
}
