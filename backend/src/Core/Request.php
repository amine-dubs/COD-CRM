<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Lightweight HTTP Request wrapper.
 *
 * Parses method, URI, headers, query params, and JSON body
 * from PHP superglobals. Immutable after construction.
 */
class Request
{
    private string $method;
    private string $uri;
    private string $path;
    private array $query;
    private array $headers;
    private array $body;
    private array $params; // route params injected by Router
    private ?int $storeId;
    private ?array $authUser;
    private array $rateLimitHeaders = [];

    public function __construct(
        string $method,
        string $uri,
        array $headers = [],
        array $body = [],
        array $query = []
    ) {
        $this->method  = strtoupper($method);
        $this->uri     = $uri;
        $this->path    = parse_url($uri, PHP_URL_PATH) ?: '/';
        $this->query   = $query;
        $this->headers = $headers;
        $this->body    = $body;
        $this->params  = [];
        $this->storeId = null;
        $this->authUser = null;
    }

    /** Build a Request from PHP superglobals */
    public static function createFromGlobals(): self
    {
        $method  = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri     = $_SERVER['REQUEST_URI'] ?? '/';
        $query   = $_GET;

        // Parse all request headers
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$headerName] = $value;
            }
        }
        // Content-Type & Content-Length aren't prefixed with HTTP_
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = $_SERVER['CONTENT_TYPE'];
        }

        // Parse JSON body
        $body = [];
        $rawBody = file_get_contents('php://input');
        if ($rawBody) {
            $decoded = json_decode($rawBody, true);
            if (is_array($decoded)) {
                $body = $decoded;
            }
        }

        return new self($method, $uri, $headers, $body, $query);
    }

    // ── Getters ───────────────────────────────────────────

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function uri(): string
    {
        return $this->uri;
    }

    public function query(string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $this->query;
        }
        return $this->query[$key] ?? $default;
    }

    public function header(string $key, string $default = null): ?string
    {
        return $this->headers[strtolower($key)] ?? $default;
    }

    public function headers(): array
    {
        return $this->headers;
    }

    public function body(string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $this->body;
        }
        return $this->body[$key] ?? $default;
    }

    public function all(): array
    {
        return array_merge($this->query, $this->body);
    }

    public function bearerToken(): ?string
    {
        $auth = $this->header('authorization');
        if ($auth && str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }

    // ── Route Params (set by Router) ──────────────────────

    public function param(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    public function setParams(array $params): void
    {
        $this->params = $params;
    }

    // ── Tenant Context ────────────────────────────────────

    public function storeId(): ?int
    {
        return $this->storeId;
    }

    public function setStoreId(int $storeId): void
    {
        $this->storeId = $storeId;
    }

    // ── Authenticated User ────────────────────────────────

    public function authUser(): ?array
    {
        return $this->authUser;
    }

    public function setAuthUser(array $user): void
    {
        $this->authUser = $user;
    }

    public function authUserId(): ?int
    {
        return $this->authUser['id'] ?? null;
    }

    public function authUserRole(): ?string
    {
        return $this->authUser['role'] ?? null;
    }

    // ── Rate Limit Headers ───────────────────────────────────

    public function getRateLimitHeaders(): array
    {
        return $this->rateLimitHeaders;
    }

    public function setRateLimitHeaders(array $headers): void
    {
        $this->rateLimitHeaders = $headers;
    }

    // ── Additional Getters for Middleware ─────────────────────

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getHeader(string $key, ?string $default = null): ?string
    {
        return $this->header($key, $default);
    }
}
