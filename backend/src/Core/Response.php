<?php

declare(strict_types=1);

namespace App\Core;

/**
 * HTTP Response helper.
 *
 * Fluent builder for JSON responses with status codes and headers.
 */
class Response
{
    private int $statusCode;
    private array $headers;
    private mixed $body;

    public function __construct(mixed $body = null, int $statusCode = 200, array $headers = [])
    {
        $this->body       = $body;
        $this->statusCode = $statusCode;
        $this->headers    = $headers;
    }

    // ── Factory Methods ───────────────────────────────────

    public static function json(mixed $data, int $statusCode = 200, array $headers = []): self
    {
        return new self($data, $statusCode, $headers);
    }

    public static function success(mixed $data = null, string $message = 'Success', int $statusCode = 200): self
    {
        return self::json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $statusCode);
    }

    public static function created(mixed $data = null, string $message = 'Created successfully'): self
    {
        return self::success($data, $message, 201);
    }

    public static function noContent(): self
    {
        return new self(null, 204);
    }

    public static function error(string $message, int $statusCode = 400, array $errors = [], array $headers = []): self
    {
        $body = [
            'success' => false,
            'message' => $message,
        ];
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        $response = self::json($body, $statusCode);
        foreach ($headers as $name => $value) {
            $response = $response->withHeader($name, $value);
        }
        return $response;
    }

    public static function notFound(string $message = 'Resource not found'): self
    {
        return self::error($message, 404);
    }

    public static function unauthorized(string $message = 'Unauthorized'): self
    {
        return self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): self
    {
        return self::error($message, 403);
    }

    public static function validationError(array $errors, string $message = 'Validation failed'): self
    {
        return self::error($message, 422, $errors);
    }

    // ── Pagination Helper ─────────────────────────────────

    public static function paginated(array $data, int $total, int $page, int $perPage): self
    {
        $totalPages = (int)ceil($total / max($perPage, 1));

        return (new self([
            'success' => true,
            'data'    => $data,
            'meta'    => [
                'total'        => $total,
                'page'         => $page,
                'per_page'     => $perPage,
                'total_pages'  => $totalPages,
                'has_next'     => $page < $totalPages,
                'has_previous' => $page > 1,
            ],
        ], 200))
            ->withHeader('X-Pagination-Total', (string)$total)
            ->withHeader('X-Pagination-Pages', (string)$totalPages)
            ->withHeader('X-Pagination-Page', (string)$page);
    }

    // ── Header Builder ────────────────────────────────────

    public function withHeader(string $name, string $value): self
    {
        $this->headers[$name] = $value;
        return $this;
    }

    // ── Send ──────────────────────────────────────────────

    public function send(): void
    {
        http_response_code($this->statusCode);

        foreach ($this->headers as $name => $value) {
            header("{$name}: {$value}");
        }

        if ($this->statusCode === 204) {
            return; // No body for 204
        }

        if ($this->body !== null) {
            echo json_encode($this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }
}
