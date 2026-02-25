<?php

declare(strict_types=1);

namespace App\Modules\Order;

use App\Core\Database;

class OrderService
{
    private OrderRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new OrderRepository();
        $this->db = Database::getInstance();
    }

    public function list(int $storeId, int $page, int $perPage, array $filters): array
    {
        return $this->repo->paginate($storeId, $page, $perPage, $filters);
    }

    public function getById(int $id, int $storeId): ?array
    {
        $order = $this->repo->findById($id, $storeId);
        if ($order) {
            $order['items'] = $this->repo->getOrderItems($id);
            $order['history'] = $this->repo->getStatusHistory($id);
        }
        return $order;
    }

    public function create(int $storeId, int $userId, array $data): array
    {
        $this->db->beginTransaction();

        try {
            // Calculate totals
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $subtotal += (float)$item['price'] * (int)$item['quantity'];
            }

            $shippingCost = (float)($data['shipping_cost'] ?? 0);
            $totalAmount = $subtotal + $shippingCost;

            // Generate order reference
            $reference = $this->generateReference($storeId);

            $orderId = $this->db->insert('orders', [
                'store_id'       => $storeId,
                'reference'      => $reference,
                'customer_name'  => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'wilaya_id'      => (int)$data['wilaya_id'],
                'commune'        => $data['commune'],
                'address'        => $data['address'],
                'subtotal'       => $subtotal,
                'shipping_cost'  => $shippingCost,
                'total_amount'   => $totalAmount,
                'status'         => 'new',
                'notes'          => $data['notes'] ?? null,
                'created_by'     => $userId,
                'created_at'     => date('Y-m-d H:i:s'),
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);

            // Insert order items
            foreach ($data['items'] as $item) {
                $this->db->insert('order_items', [
                    'order_id'   => $orderId,
                    'product_id' => (int)$item['product_id'],
                    'quantity'   => (int)$item['quantity'],
                    'price'      => (float)$item['price'],
                    'total'      => (float)$item['price'] * (int)$item['quantity'],
                ]);
            }

            // Record status history
            $this->db->insert('order_status_history', [
                'order_id'   => $orderId,
                'status'     => 'new',
                'changed_by' => $userId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();

            return $this->getById($orderId, $storeId);
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    public function update(int $id, int $storeId, array $data): ?array
    {
        $order = $this->repo->findById($id, $storeId);
        if (!$order) {
            return null;
        }

        $allowed = ['customer_name', 'customer_phone', 'wilaya_id', 'commune', 'address', 'shipping_cost', 'notes'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        $filtered['updated_at'] = date('Y-m-d H:i:s');

        $this->repo->update($id, $storeId, $filtered);
        return $this->getById($id, $storeId);
    }

    public function updateStatus(int $id, int $storeId, string $status, int $userId): ?array
    {
        $order = $this->repo->findById($id, $storeId);
        if (!$order) {
            return null;
        }

        // Validate status transition
        $this->validateStatusTransition($order['status'], $status);

        $this->db->beginTransaction();

        try {
            $this->repo->update($id, $storeId, [
                'status'     => $status,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->insert('order_status_history', [
                'order_id'   => $id,
                'status'     => $status,
                'changed_by' => $userId,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();
            return $this->getById($id, $storeId);
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->repo->delete($id, $storeId);
    }

    private function generateReference(int $storeId): string
    {
        $count = $this->db->count('orders', 'store_id = ?', [$storeId]);
        return sprintf('ORD-%d-%06d', $storeId, $count + 1);
    }

    /**
     * COD order status flow:
     * new → confirmed → processing → shipped → delivered
     *                                       → returned
     * new → no_answer → (can go back to confirmed)
     * new → cancelled
     * new → postponed → (can go back to new)
     */
    private function validateStatusTransition(string $from, string $to): void
    {
        $allowed = [
            'new'        => ['confirmed', 'cancelled', 'no_answer', 'postponed'],
            'confirmed'  => ['processing', 'cancelled'],
            'processing' => ['shipped', 'cancelled'],
            'shipped'    => ['delivered', 'returned'],
            'no_answer'  => ['confirmed', 'cancelled', 'postponed'],
            'postponed'  => ['new', 'cancelled'],
            'delivered'  => ['returned'], // allow return after delivery
            'returned'   => [],
            'cancelled'  => [],
        ];

        if (!in_array($to, $allowed[$from] ?? [], true)) {
            throw new \RuntimeException(
                "Invalid status transition: {$from} → {$to}",
                422
            );
        }
    }
}
