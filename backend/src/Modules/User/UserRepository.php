<?php

declare(strict_types=1);

namespace App\Modules\User;

use App\Core\Database;

class UserRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id, int $storeId): ?array
    {
        return $this->db->queryOne(
            'SELECT * FROM users WHERE id = ? AND store_id = ?',
            [$id, $storeId]
        );
    }

    public function emailExistsInStore(string $email, int $storeId): bool
    {
        return $this->db->queryOne(
            'SELECT id FROM users WHERE email = ? AND store_id = ?',
            [$email, $storeId]
        ) !== null;
    }

    public function paginate(int $storeId, int $page, int $perPage, ?string $search, ?string $role): array
    {
        $where = 'store_id = ?';
        $params = [$storeId];

        if ($search) {
            $where .= ' AND (name LIKE ? OR email LIKE ?)';
            $params[] = "%{$search}%";
            $params[] = "%{$search}%";
        }

        if ($role) {
            $where .= ' AND role = ?';
            $params[] = $role;
        }

        $total = $this->db->count('users', $where, $params);
        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $data = $this->db->query(
            "SELECT id, store_id, name, email, phone, role, status, created_at, updated_at
             FROM users WHERE {$where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            $params
        );

        return ['data' => $data, 'total' => $total];
    }

    public function create(array $data): int
    {
        return $this->db->insert('users', $data);
    }

    public function update(int $id, int $storeId, array $data): int
    {
        return $this->db->update('users', $data, 'id = ? AND store_id = ?', [$id, $storeId]);
    }

    public function delete(int $id, int $storeId): bool
    {
        return $this->db->delete('users', 'id = ? AND store_id = ?', [$id, $storeId]) > 0;
    }
}
