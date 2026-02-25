<?php

declare(strict_types=1);

/**
 * JWT Configuration
 */
return [
    'secret'       => $_ENV['JWT_SECRET'] ?? 'change-me',
    'algorithm'    => 'HS256',
    'access_ttl'   => (int)($_ENV['JWT_ACCESS_TTL'] ?? 3600),       // 1 hour
    'refresh_ttl'  => (int)($_ENV['JWT_REFRESH_TTL'] ?? 604800),    // 7 days
    'issuer'       => $_ENV['APP_URL'] ?? 'http://localhost:8000',
];
