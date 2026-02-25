<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;

class AuthRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findByEmail(string $email, ?int $storeId = null): ?array
    {
        if ($storeId) {
            return $this->db->queryOne(
                'SELECT * FROM users WHERE email = ? AND store_id = ?',
                [$email, $storeId]
            );
        }
        return $this->db->queryOne('SELECT * FROM users WHERE email = ?', [$email]);
    }

    public function findById(int $id): ?array
    {
        return $this->db->queryOne('SELECT * FROM users WHERE id = ?', [$id]);
    }
}
