<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * CORS Middleware.
 *
 * Handles preflight OPTIONS requests and sets CORS headers
 * for subdomain-aware cross-origin access.
 */
class CorsMiddleware
{
    public function handle(?Request $request = null): ?Response
    {
        $config = require __DIR__ . '/../../../config/cors.php';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Check if origin is allowed (supports wildcard subdomain matching)
        $isAllowed = false;
        foreach ($config['allowed_origins'] as $allowedOrigin) {
            if ($allowedOrigin === '*') {
                $isAllowed = true;
                break;
            }
            // Support wildcard subdomain: http://*.domain.com
            if (str_contains($allowedOrigin, '*')) {
                $pattern = str_replace('*.', '([a-zA-Z0-9\-]+\.)?', $allowedOrigin);
                $pattern = '#^' . preg_quote($pattern, '#') . '$#';
                $pattern = str_replace(preg_quote('([a-zA-Z0-9\-]+\.)?', '#'), '([a-zA-Z0-9\-]+\.)?', $pattern);
                if (preg_match($pattern, $origin)) {
                    $isAllowed = true;
                    break;
                }
            } elseif ($origin === $allowedOrigin) {
                $isAllowed = true;
                break;
            }
        }

        if ($isAllowed && $origin) {
            header("Access-Control-Allow-Origin: {$origin}");
        }

        if ($config['allow_credentials']) {
            header('Access-Control-Allow-Credentials: true');
        }

        header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers']));
        header('Access-Control-Expose-Headers: ' . implode(', ', $config['exposed_headers']));
        header('Access-Control-Max-Age: ' . $config['max_age']);

        // Handle preflight
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        return null; // Continue to next middleware / handler
    }
}
