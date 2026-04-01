<?php

declare(strict_types=1);

/**
 * CORS Configuration
 *
 * Subdomain-aware: allows *.codcrm.com in production
 * and localhost origins in development.
 */
return [
    // Always include localhost + 127 variants for local frontend testing,
    // even when CORS_ALLOWED_ORIGINS is set in the environment.
    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        array_map('trim', explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '')),
        [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost',
            'http://127.0.0.1',
        ]
    )))),
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Store-Id',
        'X-Requested-With',
        'Accept',
        'Accept-Language',
    ],
    'exposed_headers' => [
        'X-Pagination-Total',
        'X-Pagination-Pages',
        'X-Pagination-Page',
    ],
    'max_age'          => 86400,
    'allow_credentials' => true,
];
