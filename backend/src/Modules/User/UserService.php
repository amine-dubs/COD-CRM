<?php

declare(strict_types=1);

namespace App\Modules\User;

class UserService
{
    private UserRepository $repo;

    public function __construct()
    {
        $this->repo = new UserRepository();
    }

    public function list(int $storeId, int $page, int $perPage, ?string $search, ?string $role): array
    {
        return $this->repo->paginate($storeId, $page, $perPage, $search, $role);
    }

    public function getById(int $id, int $storeId): ?array
    {
        $user = $this->repo->findById($id, $storeId);
        if ($user) {
            unset($user['password']);
        }
        return $user;
    }

    public function create(int $storeId, array $data): array
    {
        // Check for duplicate email within store
        if ($this->repo->emailExistsInStore($data['email'], $storeId)) {
            throw new \RuntimeException('Email already exists in this store', 409);
        }

        $id = $this->repo->create([
            'store_id'   => $storeId,
            'name'       => $data['name'],
            'email'      => $data['email'],
            'phone'      => $data['phone'] ?? null,
            'password'   => password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]),
            'role'       => $data['role'],
            'status'     => 'active',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $user = $this->repo->findById($id, $storeId);
        unset($user['password']);
        return $user;
    }

    public function update(int $id, int $storeId, array $data): ?array
    {
        $existing = $this->repo->findById($id, $storeId);
        if (!$existing) {
            return null;
        }

        // Prevent changing owner role
        if ($existing['role'] === 'owner' && isset($data['role']) && $data['role'] !== 'owner') {
            throw new \RuntimeException('Cannot change owner role', 403);
        }

        $allowed = ['name', 'email', 'phone', 'role', 'status'];
        $filtered = array_intersect_key($data, array_flip($allowed));

        if (isset($data['password']) && !empty($data['password'])) {
            $filtered['password'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        }

        $filtered['updated_at'] = date('Y-m-d H:i:s');
        $this->repo->update($id, $storeId, $filtered);

        $user = $this->repo->findById($id, $storeId);
        unset($user['password']);
        return $user;
    }

    public function delete(int $id, int $storeId): bool
    {
        $user = $this->repo->findById($id, $storeId);
        if (!$user) {
            return false;
        }

        if ($user['role'] === 'owner') {
            throw new \RuntimeException('Cannot delete store owner', 403);
        }

        return $this->repo->delete($id, $storeId);
    }
}
