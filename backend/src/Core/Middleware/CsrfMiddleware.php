<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * CSRF Protection Middleware.
 *
 * Validates that state-changing requests (POST, PUT, PATCH, DELETE) include
 * a custom header that can only be set by JavaScript (not by HTML forms).
 * This prevents CSRF attacks because cross-origin requests with custom headers
 * require a CORS preflight, which the server controls.
 *
 * Note: This middleware should be applied AFTER CorsMiddleware.
 */
class CsrfMiddleware
{
    /**
     * HTTP methods that require CSRF validation.
     */
    private const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    /**
     * Routes that are exempt from CSRF checking (e.g., webhooks, public APIs).
     */
    private const EXEMPT_ROUTES = [
        '/api/v1/storefront/',  // Public storefront APIs
    ];

    public function handle(Request $request): ?Response
    {
        $method = strtoupper($request->getMethod());

        // Only check state-changing methods
        if (!in_array($method, self::PROTECTED_METHODS, true)) {
            return null; // Continue
        }

        // Check if route is exempt
        $path = $request->getPath();
        foreach (self::EXEMPT_ROUTES as $exempt) {
            if (str_starts_with($path, $exempt)) {
                return null; // Continue
            }
        }

        // Validate X-Requested-With header
        // This header can only be set by JavaScript, not by HTML forms
        $requestedWith = $request->getHeader('X-Requested-With');
        if ($requestedWith !== 'XMLHttpRequest') {
            return Response::forbidden('CSRF validation failed: missing or invalid X-Requested-With header');
        }

        return null; // Continue
    }
}
