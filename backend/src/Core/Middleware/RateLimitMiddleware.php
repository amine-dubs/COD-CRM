<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * Rate Limiting Middleware.
 *
 * Simple in-memory rate limiter using file-based storage.
 * For production, consider using Redis or Memcached for distributed rate limiting.
 *
 * Default limits:
 * - Auth endpoints: 5 requests per minute (brute force protection)
 * - General API: 60 requests per minute
 */
class RateLimitMiddleware
{
    private int $maxRequests;
    private int $windowSeconds;
    private string $storageDir;

    /**
     * @param int $maxRequests Maximum requests allowed in the time window
     * @param int $windowSeconds Time window in seconds
     */
    public function __construct(int $maxRequests = 60, int $windowSeconds = 60)
    {
        $this->maxRequests = $maxRequests;
        $this->windowSeconds = $windowSeconds;
        $this->storageDir = sys_get_temp_dir() . '/cod_crm_rate_limit';

        if (!is_dir($this->storageDir)) {
            @mkdir($this->storageDir, 0755, true);
        }
    }

    public function handle(Request $request): ?Response
    {
        $identifier = $this->getClientIdentifier($request);
        $path = $request->getPath();

        // Apply stricter limits for auth endpoints
        $isAuthEndpoint = str_contains($path, '/auth/login') ||
                          str_contains($path, '/auth/register') ||
                          str_contains($path, '/admin/login');

        $maxRequests = $isAuthEndpoint ? 5 : $this->maxRequests;
        $windowSeconds = $isAuthEndpoint ? 60 : $this->windowSeconds;

        $key = $this->generateKey($identifier, $isAuthEndpoint ? 'auth' : 'api');

        $data = $this->getData($key);
        $now = time();

        // Clean up old entries
        if ($data && ($now - $data['window_start']) >= $windowSeconds) {
            $data = null;
        }

        if (!$data) {
            $data = [
                'window_start' => $now,
                'count' => 0,
            ];
        }

        $data['count']++;
        $this->saveData($key, $data);

        // Calculate remaining requests and reset time
        $remaining = max(0, $maxRequests - $data['count']);
        $resetTime = $data['window_start'] + $windowSeconds;

        // Check if limit exceeded
        if ($data['count'] > $maxRequests) {
            $retryAfter = $resetTime - $now;

            return Response::error(
                'Rate limit exceeded. Please try again later.',
                429,
                [
                    'X-RateLimit-Limit' => (string)$maxRequests,
                    'X-RateLimit-Remaining' => '0',
                    'X-RateLimit-Reset' => (string)$resetTime,
                    'Retry-After' => (string)$retryAfter,
                ]
            );
        }

        // Set rate limit headers for successful requests
        // These will be added by the response handler
        $request->setRateLimitHeaders([
            'X-RateLimit-Limit' => (string)$maxRequests,
            'X-RateLimit-Remaining' => (string)$remaining,
            'X-RateLimit-Reset' => (string)$resetTime,
        ]);

        return null; // Continue
    }

    private function getClientIdentifier(Request $request): string
    {
        // Use IP address as identifier
        // In production with load balancers, check X-Forwarded-For header
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['HTTP_X_REAL_IP']
            ?? $_SERVER['REMOTE_ADDR']
            ?? 'unknown';

        // If multiple IPs in X-Forwarded-For, use the first one (client IP)
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }

        return $ip;
    }

    private function generateKey(string $identifier, string $type): string
    {
        return md5($identifier . ':' . $type);
    }

    private function getData(string $key): ?array
    {
        $file = $this->storageDir . '/' . $key;
        if (!file_exists($file)) {
            return null;
        }

        $content = @file_get_contents($file);
        if (!$content) {
            return null;
        }

        return json_decode($content, true);
    }

    private function saveData(string $key, array $data): void
    {
        $file = $this->storageDir . '/' . $key;
        @file_put_contents($file, json_encode($data), LOCK_EX);
    }
}
