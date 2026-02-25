<?php

declare(strict_types=1);

/**
 * Application Configuration
 */
return [
    'name'         => 'COD CRM API',
    'env'          => $_ENV['APP_ENV'] ?? 'production',
    'debug'        => ($_ENV['APP_DEBUG'] ?? 'false') === 'true',
    'url'          => $_ENV['APP_URL'] ?? 'http://localhost:8000',
    'frontend_url' => $_ENV['APP_FRONTEND_URL'] ?? 'http://localhost:3000',
    'timezone'     => 'Africa/Algiers',
    'locale'       => 'fr',
    'supported_locales' => ['ar', 'fr', 'en'],

    // Pagination defaults
    'per_page'     => 25,
    'max_per_page' => 100,

    // Upload limits (bytes)
    'max_upload_size' => (int)($_ENV['MAX_UPLOAD_SIZE'] ?? 10485760),
];
