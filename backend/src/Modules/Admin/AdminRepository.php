<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\Database;

class AdminRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── Super Admin Auth ──────────────────────────────────

    public function findSuperAdminByEmail(string $email): ?array
    {
        return $this->db->queryOne(
            "SELECT * FROM super_admins WHERE email = :email AND status = 'active' LIMIT 1",
            ['email' => $email]
        );
    }

    public function findSuperAdminById(int $id): ?array
    {
        return $this->db->queryOne(
            "SELECT id, name, email, role, status, last_login, created_at FROM super_admins WHERE id = :id LIMIT 1",
            ['id' => $id]
        );
    }

    public function updateSuperAdminLastLogin(int $id): void
    {
        $this->db->execute(
            "UPDATE super_admins SET last_login = NOW() WHERE id = :id",
            ['id' => $id]
        );
    }

    // ── Stores ────────────────────────────────────────────

    public function getStores(int $page, int $perPage, ?string $search = null, ?string $status = null): array
    {
        $where = [];
        $params = [];

        if ($search) {
            $where[] = "(s.name LIKE :search OR s.slug LIKE :search2 OR s.phone LIKE :search3)";
            $params['search'] = "%{$search}%";
            $params['search2'] = "%{$search}%";
            $params['search3'] = "%{$search}%";
        }

        if ($status && $status !== 'all') {
            $where[] = "s.status = :status";
            $params['status'] = $status;
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countRow = $this->db->queryOne(
            "SELECT COUNT(*) as total FROM stores s {$whereClause}",
            $params
        );
        $total = (int) ($countRow['total'] ?? 0);

        // Fetch stores with counts
        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $stores = $this->db->query(
            "SELECT s.*,
                    (SELECT COUNT(*) FROM users u WHERE u.store_id = s.id) as users_count,
                    (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) as orders_count
             FROM stores s
             {$whereClause}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return [
            'data' => $stores,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $total > 0 ? (int) ceil($total / $perPage) : 1,
                'has_next' => ($page * $perPage) < $total,
                'has_previous' => $page > 1,
            ],
        ];
    }

    public function updateStoreStatus(int $storeId, string $status): bool
    {
        $affected = $this->db->execute(
            "UPDATE stores SET status = :status, updated_at = NOW() WHERE id = :id",
            ['status' => $status, 'id' => $storeId]
        );
        return $affected > 0;
    }

    public function findStoreById(int $id): ?array
    {
        return $this->db->queryOne(
            "SELECT * FROM stores WHERE id = :id LIMIT 1",
            ['id' => $id]
        );
    }

    // ── Users (all platform) ──────────────────────────────

    public function getAllUsers(int $page, int $perPage, ?string $search = null): array
    {
        $where = [];
        $params = [];

        if ($search) {
            $where[] = "(u.name LIKE :search OR u.email LIKE :search2)";
            $params['search'] = "%{$search}%";
            $params['search2'] = "%{$search}%";
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count
        $countRow = $this->db->queryOne(
            "SELECT COUNT(*) as total FROM users u {$whereClause}",
            $params
        );
        $total = (int) ($countRow['total'] ?? 0);

        // Fetch
        $offset = ($page - 1) * $perPage;

        // Add LIMIT/OFFSET as parameters to prevent SQL injection
        $params[] = (int)$perPage;
        $params[] = (int)$offset;

        $users = $this->db->query(
            "SELECT u.id, u.store_id, u.name, u.email, u.phone, u.role, u.status, u.last_login, u.created_at, u.updated_at,
                    s.name as store_name
             FROM users u
             LEFT JOIN stores s ON s.id = u.store_id
             {$whereClause}
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?",
            $params
        );

        return [
            'data' => $users,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $total > 0 ? (int) ceil($total / $perPage) : 1,
                'has_next' => ($page * $perPage) < $total,
                'has_previous' => $page > 1,
            ],
        ];
    }

    // ── Platform Stats ────────────────────────────────────

    public function getPlatformStats(): array
    {
        $stats = [];

        $storeStats = $this->db->queryOne(
            "SELECT COUNT(*) as total, SUM(status = 'active') as active, SUM(status = 'suspended') as suspended FROM stores"
        );
        $stats['total_stores'] = (int) ($storeStats['total'] ?? 0);
        $stats['active_stores'] = (int) ($storeStats['active'] ?? 0);
        $stats['suspended_stores'] = (int) ($storeStats['suspended'] ?? 0);

        $userStats = $this->db->queryOne("SELECT COUNT(*) as total FROM users");
        $stats['total_users'] = (int) ($userStats['total'] ?? 0);

        $orderStats = $this->db->queryOne(
            "SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as revenue FROM orders"
        );
        $stats['total_orders'] = (int) ($orderStats['total'] ?? 0);
        $stats['total_revenue'] = (float) ($orderStats['revenue'] ?? 0);

        return $stats;
    }
}
