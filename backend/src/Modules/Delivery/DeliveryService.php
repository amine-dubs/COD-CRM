<?php

declare(strict_types=1);

namespace App\Modules\Delivery;

use App\Core\Database;

class DeliveryService
{
    private DeliveryRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new DeliveryRepository();
        $this->db = Database::getInstance();
    }

    public function list(int $storeId, int $page, int $perPage, array $filters): array
    {
        return $this->repo->paginate($storeId, $page, $perPage, $filters);
    }

    public function getById(int $id, int $storeId): ?array
    {
        return $this->repo->findById($id, $storeId);
    }

    public function create(int $storeId, int $userId, array $data): array
    {
        // Validate that the order belongs to this store
        $order = $this->db->fetchOne(
            "SELECT id FROM orders WHERE id = :id AND store_id = :store_id",
            ['id' => (int)$data['order_id'], 'store_id' => $storeId]
        );
        if (!$order) {
            throw new \InvalidArgumentException('Order not found or does not belong to this store');
        }

        $id = $this->db->insert('deliveries', [
            'store_id'         => $storeId,
            'order_id'         => (int)$data['order_id'],
            'delivery_partner' => $data['delivery_partner'],
            'tracking_number'  => $data['tracking_number'] ?? null,
            'status'           => 'pending',
            'shipping_cost'    => (float)($data['shipping_cost'] ?? 0),
            'notes'            => $data['notes'] ?? null,
            'created_by'       => $userId,
            'created_at'       => date('Y-m-d H:i:s'),
            'updated_at'       => date('Y-m-d H:i:s'),
        ]);

        return $this->repo->findById($id, $storeId);
    }

    public function updateStatus(int $id, int $storeId, string $status, int $userId): ?array
    {
        $delivery = $this->repo->findById($id, $storeId);
        if (!$delivery) {
            return null;
        }

        $updateData = [
            'status'     => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if ($status === 'delivered') {
            $updateData['delivered_at'] = date('Y-m-d H:i:s');
        }

        $this->repo->update($id, $storeId, $updateData);
        return $this->repo->findById($id, $storeId);
    }
}
