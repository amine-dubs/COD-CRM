<?php

declare(strict_types=1);

namespace App\Modules\Product;

class ProductService
{
    private ProductRepository $repo;

    public function __construct()
    {
        $this->repo = new ProductRepository();
    }

    public function list(int $storeId, int $page, int $perPage, array $filters): array
    {
        return $this->repo->paginate($storeId, $page, $perPage, $filters);
    }

    public function getById(int $id, int $storeId): ?array
    {
        return $this->repo->findById($id, $storeId);
    }

    public function create(int $storeId, array $data): array
    {
        $sku = $data['sku'] ?? $this->generateSku($storeId);

        $id = $this->repo->create([
            'store_id'    => $storeId,
            'name'        => $data['name'],
            'sku'         => $sku,
            'description' => $data['description'] ?? null,
            'price'       => (float)$data['price'],
            'cost_price'  => (float)($data['cost_price'] ?? 0),
            'weight'      => (float)($data['weight'] ?? 0),
            'category'    => $data['category'] ?? null,
            'image_url'   => $data['image_url'] ?? null,
            'status'      => 'active',
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        return $this->repo->findById($id, $storeId);
    }

    public function update(int $id, int $storeId, array $data): ?array
    {
        $existing = $this->repo->findById($id, $storeId);
        if (!$existing) {
            return null;
        }

        $allowed = ['name', 'sku', 'description', 'price', 'cost_price', 'weight', 'category', 'image_url', 'status'];
        $filtered = array_intersect_key($data, array_flip($allowed));
        $filtered['updated_at'] = date('Y-m-d H:i:s');

        $this->repo->update($id, $storeId, $filtered);
        return $this->repo->findById($id, $storeId);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->repo->delete($id, $storeId);
    }

    private function generateSku(int $storeId): string
    {
        return sprintf('PRD-%d-%s', $storeId, strtoupper(substr(md5((string)microtime(true)), 0, 8)));
    }
}
