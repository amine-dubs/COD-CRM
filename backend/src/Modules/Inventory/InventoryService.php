<?php

declare(strict_types=1);

namespace App\Modules\Inventory;

use App\Core\Database;

class InventoryService
{
    private InventoryRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new InventoryRepository();
        $this->db = Database::getInstance();
    }

    public function list(int $storeId, int $page, int $perPage, array $filters): array
    {
        return $this->repo->paginate($storeId, $page, $perPage, $filters);
    }

    public function adjust(int $storeId, int $productId, int $quantity, string $type, ?string $reason, int $userId): array
    {
        $this->db->beginTransaction();

        try {
            $current = $this->repo->getStock($storeId, $productId);
            $previousQty = $current ? (int)$current['quantity'] : 0;

            $newQty = match ($type) {
                'add'      => $previousQty + $quantity,
                'subtract' => max(0, $previousQty - $quantity),
                'set'      => max(0, $quantity),
            };

            // Upsert inventory record
            if ($current) {
                $this->repo->updateStock($storeId, $productId, $newQty);
            } else {
                $this->repo->createStock($storeId, $productId, $newQty);
            }

            // Log the movement
            $this->db->insert('inventory_movements', [
                'store_id'      => $storeId,
                'product_id'    => $productId,
                'type'          => $type,
                'quantity'       => $quantity,
                'previous_qty'  => $previousQty,
                'new_qty'       => $newQty,
                'reason'        => $reason,
                'performed_by'  => $userId,
                'created_at'    => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();

            return [
                'product_id'   => $productId,
                'previous_qty' => $previousQty,
                'new_qty'      => $newQty,
                'adjustment'   => $type,
            ];
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    public function getHistory(int $storeId, int $productId): array
    {
        return $this->repo->getMovements($storeId, $productId);
    }

    public function getLowStockAlerts(int $storeId, int $threshold = 10): array
    {
        return $this->repo->getLowStock($storeId, $threshold);
    }
}
