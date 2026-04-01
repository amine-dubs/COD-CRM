<?php

declare(strict_types=1);

/**
 * COD CRM — Front Controller
 *
 * Every HTTP request enters here.
 * 1. Autoload dependencies
 * 2. Load environment
 * 3. Boot middleware pipeline
 * 4. Dispatch to router
 */

// ── Autoloader ────────────────────────────────────────────────
require_once __DIR__ . '/../vendor/autoload.php';

// ── Environment ───────────────────────────────────────────────
use Dotenv\Dotenv;
use App\Core\Router;
use App\Core\Request;
use App\Core\Response;
use App\Core\Database;
use App\Core\Middleware\CorsMiddleware;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// ── Error Handling ────────────────────────────────────────────
if ($_ENV['APP_DEBUG'] === 'true') {
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

// ── Build Request ─────────────────────────────────────────────
$request = Request::createFromGlobals();

// ── Load Routes & Dispatch ────────────────────────────────────
$router = new Router();
require_once __DIR__ . '/../routes/api.php';

try {
    $response = $router->dispatch($request);
    $response->send();
} catch (\Throwable $e) {
    $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;

    $body = [
        'success' => false,
        'message' => $e->getMessage(),
    ];

    if ($_ENV['APP_DEBUG'] === 'true') {
        $body['trace'] = $e->getTraceAsString();
    }

    Response::json($body, $statusCode)->send();
}
