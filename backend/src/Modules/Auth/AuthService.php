<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Helpers\JwtHelper;

class AuthService
{
    private AuthRepository $repo;
    private Database $db;

    public function __construct()
    {
        $this->repo = new AuthRepository();
        $this->db = Database::getInstance();
    }

    /**
     * Register a new owner + store.
     * Creates a store, then the owner user, then returns tokens.
     */
    public function register(array $data): array
    {
        // Check if email already exists
        if ($this->repo->findByEmail($data['email'])) {
            throw new \RuntimeException('Email already registered', 409);
        }

        $this->db->beginTransaction();

        try {
            // 1. Create the store
            $storeSlug = $this->generateSlug($data['store_name']);
            $storeId = $this->db->insert('stores', [
                'name'       => $data['store_name'],
                'slug'       => $storeSlug,
                'status'     => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // 2. Create the owner user
            $userId = $this->db->insert('users', [
                'store_id'   => $storeId,
                'name'       => $data['name'],
                'email'      => $data['email'],
                'phone'      => $data['phone'] ?? null,
                'password'   => password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]),
                'role'       => 'owner',
                'status'     => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            $this->db->commit();

            $user = [
                'id'    => $userId,
                'name'  => $data['name'],
                'email' => $data['email'],
                'role'  => 'owner',
            ];

            $tokens = JwtHelper::generateTokenPair($user, $storeId);

            return [
                'user'  => $user,
                'store' => [
                    'id'   => $storeId,
                    'name' => $data['store_name'],
                    'slug' => $storeSlug,
                ],
                'tokens' => $tokens,
            ];
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Authenticate user and return tokens.
     */
    public function login(string $email, string $password, ?int $storeId = null): ?array
    {
        $user = $this->repo->findByEmail($email, $storeId);

        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }

        if ($user['status'] !== 'active') {
            throw new \RuntimeException('Account is disabled', 403);
        }

        $tokens = JwtHelper::generateTokenPair($user, (int)$user['store_id']);

        // Remove sensitive fields
        unset($user['password']);

        return [
            'user'   => $user,
            'tokens' => $tokens,
        ];
    }

    /**
     * Refresh access token using a valid refresh token.
     */
    public function refreshToken(string $refreshToken): ?array
    {
        try {
            $payload = JwtHelper::validateRefreshToken($refreshToken);
            $user = $this->repo->findById((int)$payload['sub']);

            if (!$user || $user['status'] !== 'active') {
                return null;
            }

            return JwtHelper::generateTokenPair($user, (int)$payload['store_id']);
        } catch (\RuntimeException) {
            return null;
        }
    }

    /**
     * Get authenticated user's profile.
     */
    public function getProfile(int $userId, int $storeId): ?array
    {
        $user = $this->repo->findById($userId);

        if (!$user || (int)$user['store_id'] !== $storeId) {
            return null;
        }

        unset($user['password']);
        return $user;
    }

    private function generateSlug(string $name): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-'));

        // Ensure uniqueness
        $original = $slug;
        $counter = 1;
        while ($this->db->queryOne('SELECT id FROM stores WHERE slug = ?', [$slug])) {
            $slug = $original . '-' . $counter++;
        }

        return $slug;
    }
}
