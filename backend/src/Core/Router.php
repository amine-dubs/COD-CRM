<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Lightweight Router with middleware support.
 *
 * Supports:
 * - Route parameters: /api/orders/{id}
 * - Route groups with shared prefix & middleware
 * - Middleware pipeline (before handler)
 * - HTTP methods: GET, POST, PUT, PATCH, DELETE
 */
class Router
{
    private array $routes = [];
    private array $groupStack = [];

    // ── Route Registration ────────────────────────────────

    public function get(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    // ── Route Groups ──────────────────────────────────────

    /**
     * Group routes under a shared prefix with shared middleware.
     *
     * Usage:
     *   $router->group('/api/v1', [AuthMiddleware::class], function ($router) {
     *       $router->get('/orders', [OrderController::class, 'index']);
     *   });
     */
    public function group(string $prefix, array $middleware, callable $callback): void
    {
        $this->groupStack[] = [
            'prefix'     => $prefix,
            'middleware'  => $middleware,
        ];

        $callback($this);

        array_pop($this->groupStack);
    }

    // ── Dispatch ──────────────────────────────────────────

    /**
     * Match the incoming request against registered routes
     * and run the middleware pipeline + handler.
     */
    public function dispatch(Request $request): Response
    {
        $method = $request->method();
        $path   = rtrim($request->path(), '/') ?: '/';

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = $this->matchRoute($route['pattern'], $path);
            if ($params === false) {
                continue;
            }

            // Inject matched route params into the request
            $request->setParams($params);

            // Run middleware pipeline
            foreach ($route['middleware'] as $middlewareClass) {
                $middlewareInstance = new $middlewareClass();
                $result = $middlewareInstance->handle($request);
                if ($result instanceof Response) {
                    return $result; // Middleware short-circuited
                }
            }

            // Call the handler
            return $this->callHandler($route['handler'], $request);
        }

        return Response::notFound('Route not found');
    }

    // ── Internal ──────────────────────────────────────────

    private function addRoute(string $method, string $path, callable|array $handler, array $middleware): void
    {
        $fullPrefix = '';
        $groupMiddleware = [];

        foreach ($this->groupStack as $group) {
            $fullPrefix .= $group['prefix'];
            $groupMiddleware = array_merge($groupMiddleware, $group['middleware']);
        }

        $fullPath = $fullPrefix . $path;
        $allMiddleware = array_merge($groupMiddleware, $middleware);

        // Convert path to regex pattern: /orders/{id} → /orders/(?P<id>[^/]+)
        $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $fullPath);
        $pattern = '#^' . rtrim($pattern, '/') . '/?$#';

        $this->routes[] = [
            'method'     => $method,
            'pattern'    => $pattern,
            'handler'    => $handler,
            'middleware'  => $allMiddleware,
        ];
    }

    /**
     * Attempt to match a regex pattern against a URI path.
     * Returns an associative array of named params, or false.
     */
    private function matchRoute(string $pattern, string $path): array|false
    {
        if (!preg_match($pattern, $path, $matches)) {
            return false;
        }

        // Filter out numeric keys, keep only named groups
        return array_filter($matches, fn ($key) => !is_int($key), ARRAY_FILTER_USE_KEY);
    }

    /**
     * Call a route handler — supports both closures and [Controller, method] arrays.
     */
    private function callHandler(callable|array $handler, Request $request): Response
    {
        if (is_array($handler) && count($handler) === 2) {
            [$controllerClass, $method] = $handler;
            $controller = new $controllerClass();
            return $controller->{$method}($request);
        }

        return call_user_func($handler, $request);
    }
}
