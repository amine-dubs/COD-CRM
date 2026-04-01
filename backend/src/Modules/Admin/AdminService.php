<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\Helpers\JwtHelper;

class AdminService
{
    private AdminRepository $repo;

    public function __construct()
    {
        $this->repo = new AdminRepository();
    }

    // ── Auth ──────────────────────────────────────────────

    public function login(string $email, string $password): array
    {
        $admin = $this->repo->findSuperAdminByEmail($email);

        if (!$admin || !password_verify($password, $admin['password'])) {
            throw new \Exception('Invalid credentials', 401);
        }

        $this->repo->updateSuperAdminLastLogin((int) $admin['id']);

        // Build user array for JwtHelper (needs 'id', 'role', 'email')
        $adminUser = [
            'id'    => (int) $admin['id'],
            'email' => $admin['email'],
            'role'  => 'super_admin',
        ];

        // Generate tokens — store_id = 0 for super admin (no tenant)
        $config = require __DIR__ . '/../../../config/jwt.php';
        $now = time();

        $accessPayload = [
            'iss'      => $config['issuer'] ?? 'codcrm',
            'iat'      => $now,
            'exp'      => $now + ($config['access_ttl'] ?? 3600),
            'type'     => 'super_admin',
            'sub'      => (int) $admin['id'],
            'store_id' => 0,
            'role'     => 'super_admin',
            'email'    => $admin['email'],
        ];

        $refreshPayload = [
            'iss'      => $config['issuer'] ?? 'codcrm',
            'iat'      => $now,
            'exp'      => $now + ($config['refresh_ttl'] ?? 604800),
            'type'     => 'refresh_super_admin',
            'sub'      => (int) $admin['id'],
            'store_id' => 0,
        ];

        $accessToken = \Firebase\JWT\JWT::encode($accessPayload, $config['secret'], $config['algorithm'] ?? 'HS256');
        $refreshToken = \Firebase\JWT\JWT::encode($refreshPayload, $config['secret'], $config['algorithm'] ?? 'HS256');

        return [
            'user' => [
                'id'       => (int) $admin['id'],
                'name'     => $admin['name'],
                'email'    => $admin['email'],
                'role'     => 'super_admin',
                'status'   => $admin['status'],
                'store_id' => null,
            ],
            'tokens' => [
                'access_token'  => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type'    => 'Bearer',
                'expires_in'    => (int) ($config['access_ttl'] ?? 3600),
            ],
        ];
    }

    public function getProfile(int $adminId): ?array
    {
        $admin = $this->repo->findSuperAdminById($adminId);
        if ($admin) {
            $admin['role'] = 'super_admin';
            $admin['store_id'] = null;
        }
        return $admin;
    }

    // ── Stores ────────────────────────────────────────────

    public function getStores(int $page, int $perPage, ?string $search, ?string $status): array
    {
        return $this->repo->getStores($page, $perPage, $search, $status);
    }

    public function toggleStoreStatus(int $storeId, string $newStatus): array
    {
        $store = $this->repo->findStoreById($storeId);
        if (!$store) {
            throw new \Exception('Store not found', 404);
        }

        if (!in_array($newStatus, ['active', 'suspended', 'inactive'])) {
            throw new \Exception('Invalid status', 422);
        }

        $this->repo->updateStoreStatus($storeId, $newStatus);

        $store['status'] = $newStatus;
        return $store;
    }

    // ── Users ─────────────────────────────────────────────

    public function getUsers(int $page, int $perPage, ?string $search): array
    {
        return $this->repo->getAllUsers($page, $perPage, $search);
    }

    // ── Stats ─────────────────────────────────────────────

    public function getPlatformStats(): array
    {
        return $this->repo->getPlatformStats();
    }
}
