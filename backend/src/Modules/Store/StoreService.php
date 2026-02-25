<?php

declare(strict_types=1);

namespace App\Modules\Store;

use App\Core\Database;

class StoreService
{
    private StoreRepository $repo;

    public function __construct()
    {
        $this->repo = new StoreRepository();
    }

    public function getStore(int $storeId): ?array
    {
        return $this->repo->findById($storeId);
    }

    public function updateStore(int $storeId, array $data): ?array
    {
        $allowed = ['name', 'phone', 'address', 'logo_url', 'currency', 'timezone'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        $filtered['updated_at'] = date('Y-m-d H:i:s');

        $this->repo->update($storeId, $filtered);
        return $this->repo->findById($storeId);
    }

    public function getStoreStats(int $storeId): array
    {
        return $this->repo->getStats($storeId);
    }
}
