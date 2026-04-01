<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

/**
 * Tenant Middleware.
 *
 * Resolves the store context from either:
 * 1. The JWT token payload (set by AuthMiddleware)
 * 2. The X-Store-Id header (for public endpoints)
 *
 * Validates that the store exists and is active.
 * Must run AFTER AuthMiddleware for protected routes.
 */
class TenantMiddleware
{
    public function handle(Request $request): ?Response
    {
        $storeId = $request->storeId();

        // Fallback to header if not set by AuthMiddleware
        if (!$storeId) {
            $headerStoreId = $request->header('x-store-id');
            if ($headerStoreId && is_numeric($headerStoreId)) {
                $storeId = (int)$headerStoreId;
            }
        }

        if (!$storeId) {
            return Response::error('Store context is required', 400);
        }

        // Verify the store exists and is active
        $db = Database::getInstance();
        $store = $db->queryOne(
            'SELECT id, name, slug, status FROM stores WHERE id = ? AND status = ?',
            [$storeId, 'active']
        );

        if (!$store) {
            return Response::error('Store not found or inactive', 404);
        }

        $request->setStoreId((int)$store['id']);

        return null; // Continue
    }
}
