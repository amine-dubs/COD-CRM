<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\JwtHelper;

/**
 * Authentication Middleware.
 *
 * Validates the Bearer token from the Authorization header,
 * decodes it, and injects the authenticated user into the Request.
 */
class AuthMiddleware
{
    public function handle(Request $request): ?Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return Response::unauthorized('Missing authentication token');
        }

        try {
            $payload = JwtHelper::validateAccessToken($token);

            // Inject authenticated user context into request
            $request->setAuthUser([
                'id'       => (int)$payload['sub'],
                'store_id' => (int)$payload['store_id'],
                'role'     => $payload['role'] ?? null,
                'email'    => $payload['email'] ?? null,
            ]);

            // Also set store_id on the request for tenant isolation
            $request->setStoreId((int)$payload['store_id']);

        } catch (\RuntimeException $e) {
            return Response::unauthorized($e->getMessage());
        }

        return null; // Continue to next middleware
    }
}
