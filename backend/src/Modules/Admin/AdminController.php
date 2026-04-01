<?php

declare(strict_types=1);

namespace App\Modules\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\JwtHelper;

class AdminController
{
    private AdminService $service;

    public function __construct()
    {
        $this->service = new AdminService();
    }

    /**
     * Super Admin Login
     * POST /api/v1/admin/login
     */
    public function login(Request $request): Response
    {
        $body = $request->body();

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';

        if (!$email || !$password) {
            return Response::error('Email and password are required', 422);
        }

        try {
            $result = $this->service->login($email, $password);
            return Response::success($result, 'Login successful');
        } catch (\Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    /**
     * Get current super admin profile
     * GET /api/v1/admin/me
     */
    public function me(Request $request): Response
    {
        $adminId = $this->getAdminId();
        if (!$adminId) {
            return Response::error('Unauthorized', 401);
        }

        $profile = $this->service->getProfile($adminId);
        if (!$profile) {
            return Response::error('Admin not found', 404);
        }

        return Response::success($profile);
    }

    /**
     * Get platform stats
     * GET /api/v1/admin/stats
     */
    public function stats(Request $request): Response
    {
        $this->requireSuperAdmin();

        $stats = $this->service->getPlatformStats();
        return Response::success($stats);
    }

    /**
     * List all stores
     * GET /api/v1/admin/stores
     */
    public function stores(Request $request): Response
    {
        $this->requireSuperAdmin();

        $page = (int) ($request->query('page') ?? 1);
        $perPage = (int) ($request->query('per_page') ?? 15);
        $search = $request->query('search');
        $status = $request->query('status');

        $result = $this->service->getStores($page, $perPage, $search, $status);
        $meta = $result['meta'];
        return Response::paginated($result['data'], $meta['total'], $meta['page'], $meta['per_page']);
    }

    /**
     * Toggle store status
     * PATCH /api/v1/admin/stores/{id}/status
     */
    public function toggleStoreStatus(Request $request): Response
    {
        $this->requireSuperAdmin();

        $id = (int) $request->param('id');
        $body = $request->body();
        $newStatus = $body['status'] ?? '';

        try {
            $store = $this->service->toggleStoreStatus($id, $newStatus);
            return Response::success($store, 'Store status updated');
        } catch (\Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * List all users (across all stores)
     * GET /api/v1/admin/users
     */
    public function users(Request $request): Response
    {
        $this->requireSuperAdmin();

        $page = (int) ($request->query('page') ?? 1);
        $perPage = (int) ($request->query('per_page') ?? 20);
        $search = $request->query('search');

        $result = $this->service->getUsers($page, $perPage, $search);
        $meta = $result['meta'];
        return Response::paginated($result['data'], $meta['total'], $meta['page'], $meta['per_page']);
    }

    // ── Helpers ───────────────────────────────────────────

    private function getAdminId(): ?int
    {
        $token = $this->extractToken();
        if (!$token) return null;

        try {
            $payload = JwtHelper::decode($token);
            if (($payload['type'] ?? '') !== 'super_admin') return null;
            return (int) $payload['sub'];
        } catch (\Exception) {
            return null;
        }
    }

    private function requireSuperAdmin(): void
    {
        $adminId = $this->getAdminId();
        if (!$adminId) {
            Response::error('Unauthorized — Super Admin access required', 403)->send();
            exit;
        }
    }

    private function extractToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)$/i', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }
}
