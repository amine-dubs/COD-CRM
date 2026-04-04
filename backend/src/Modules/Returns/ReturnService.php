<?php

declare(strict_types=1);

namespace App\Modules\Returns;

use App\Core\Database;

class ReturnService
{
    private ReturnRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new ReturnRepository();
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
        $order = $this->db->queryOne(
            "SELECT id FROM orders WHERE id = :id AND store_id = :store_id",
            ['id' => (int)$data['order_id'], 'store_id' => $storeId]
        );
        if (!$order) {
            throw new \InvalidArgumentException('Order not found or does not belong to this store');
        }

        $id = $this->db->insert('returns', [
            'store_id'   => $storeId,
            'order_id'   => (int)$data['order_id'],
            'reason'     => $data['reason'],
            'notes'      => $data['notes'] ?? null,
            'status'     => 'pending',
            'created_by' => $userId,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->repo->findById($id, $storeId);
    }

    public function update(int $id, int $storeId, array $data): ?array
    {
        $return = $this->repo->findById($id, $storeId);
        if (!$return) {
            return null;
        }

        $allowed = ['reason', 'notes'];
        $filtered = array_intersect_key($data, array_flip($allowed));

        if (array_key_exists('reason', $filtered)) {
            $reason = trim((string)$filtered['reason']);
            $filtered['reason'] = $reason !== '' ? $reason : $return['reason'];
        }

        if (array_key_exists('notes', $filtered)) {
            $notes = trim((string)$filtered['notes']);
            $filtered['notes'] = $notes !== '' ? $notes : null;
        }

        if (empty($filtered)) {
            return $return;
        }

        $filtered['updated_at'] = date('Y-m-d H:i:s');
        $this->repo->update($id, $storeId, $filtered);

        return $this->repo->findById($id, $storeId);
    }

    public function updateStatus(int $id, int $storeId, string $status, int $userId): ?array
    {
        $return = $this->repo->findById($id, $storeId);
        if (!$return) {
            return null;
        }

        $this->repo->update($id, $storeId, [
            'status'     => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->repo->findById($id, $storeId);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->repo->delete($id, $storeId);
    }
}
