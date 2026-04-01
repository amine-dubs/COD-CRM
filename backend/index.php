<?php

declare(strict_types=1);

/**
 * COD CRM — Front Controller (Shared Hosting Version)
 *
 * This version works when ALL backend files are in the SAME directory.
 * 
 * Upload structure on Hostinger:
 *   public_html/api/
 *   ├── .htaccess
 *   ├── index.php          ← THIS FILE
 *   ├── .env
 *   ├── composer.json
 *   ├── composer.lock
 *   ├── vendor/
 *   ├── src/
 *   ├── config/
 *   ├── routes/
 *   ├── database/
 *   └── storage/
 */

// ── Base Path (same directory as this file) ───────────────────
$basePath = __DIR__;

// ── Autoloader ────────────────────────────────────────────────
if (!file_exists($basePath . '/vendor/autoload.php')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Vendor directory not found. Run: composer install',
    ]);
    exit;
}
require_once $basePath . '/vendor/autoload.php';

// ── Environment ───────────────────────────────────────────────
use Dotenv\Dotenv;
use App\Core\Router;
use App\Core\Request;
use App\Core\Response;
use App\Core\Database;
use App\Core\Middleware\CorsMiddleware;

if (!file_exists($basePath . '/.env')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '.env file not found. Create it from .env.example',
    ]);
    exit;
}
$dotenv = Dotenv::createImmutable($basePath);
$dotenv->load();

// ── Error Handling ────────────────────────────────────────────
if (($_ENV['APP_DEBUG'] ?? 'false') === 'true') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(0);
}

// ── Set JSON Content Type ─────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');

// ── CORS ──────────────────────────────────────────────────────
$cors = new CorsMiddleware();
$cors->handle();

// ── Database Connection ───────────────────────────────────────
Database::getInstance();

// ── Fix REQUEST_URI for subdirectory hosting ──────────────────
// When hosted at /api/, REQUEST_URI will be /api/v1/auth/login
// But our routes are defined as /api/v1/auth/login — so it matches directly.
// However if it comes as /api/api/v1/... we need to fix it.
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

// ── Build Request ─────────────────────────────────────────────
$request = Request::createFromGlobals();

// ── Load Routes & Dispatch ────────────────────────────────────
$router = new Router();
require_once $basePath . '/routes/api.php';

try {
    $response = $router->dispatch($request);
    $response->send();
} catch (\Throwable $e) {
    $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;

    $body = [
        'success' => false,
        'message' => $e->getMessage(),
    ];

    if (($_ENV['APP_DEBUG'] ?? 'false') === 'true') {
        $body['trace'] = $e->getTraceAsString();
    }

    Response::json($body, $statusCode)->send();
}
