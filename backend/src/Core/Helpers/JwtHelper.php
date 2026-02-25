<?php

declare(strict_types=1);

namespace App\Core\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

/**
 * JWT Token Helper.
 *
 * Generates access & refresh tokens, validates and decodes them.
 * Uses firebase/php-jwt under the hood.
 */
class JwtHelper
{
    private static ?array $config = null;

    private static function config(): array
    {
        if (self::$config === null) {
            self::$config = require __DIR__ . '/../../../config/jwt.php';
        }
        return self::$config;
    }

    /**
     * Generate an access token for a user.
     */
    public static function generateAccessToken(array $user, int $storeId): string
    {
        $config = self::config();
        $now = time();

        $payload = [
            'iss'      => $config['issuer'],
            'iat'      => $now,
            'exp'      => $now + $config['access_ttl'],
            'type'     => 'access',
            'sub'      => $user['id'],
            'store_id' => $storeId,
            'role'     => $user['role'] ?? null,
            'email'    => $user['email'] ?? null,
        ];

        return JWT::encode($payload, $config['secret'], $config['algorithm']);
    }

    /**
     * Generate a refresh token for a user.
     */
    public static function generateRefreshToken(int $userId, int $storeId): string
    {
        $config = self::config();
        $now = time();

        $payload = [
            'iss'      => $config['issuer'],
            'iat'      => $now,
            'exp'      => $now + $config['refresh_ttl'],
            'type'     => 'refresh',
            'sub'      => $userId,
            'store_id' => $storeId,
        ];

        return JWT::encode($payload, $config['secret'], $config['algorithm']);
    }

    /**
     * Generate both access and refresh tokens.
     */
    public static function generateTokenPair(array $user, int $storeId): array
    {
        return [
            'access_token'  => self::generateAccessToken($user, $storeId),
            'refresh_token' => self::generateRefreshToken($user['id'], $storeId),
            'token_type'    => 'Bearer',
            'expires_in'    => self::config()['access_ttl'],
        ];
    }

    /**
     * Decode and validate a JWT token.
     *
     * @return array Decoded payload as associative array.
     * @throws \RuntimeException On invalid or expired token.
     */
    public static function decode(string $token): array
    {
        $config = self::config();

        try {
            $decoded = JWT::decode($token, new Key($config['secret'], $config['algorithm']));
            return (array)$decoded;
        } catch (ExpiredException $e) {
            throw new \RuntimeException('Token has expired', 401);
        } catch (\Exception $e) {
            throw new \RuntimeException('Invalid token', 401);
        }
    }

    /**
     * Validate that a token is an access token (not a refresh token).
     */
    public static function validateAccessToken(string $token): array
    {
        $payload = self::decode($token);

        if (($payload['type'] ?? '') !== 'access') {
            throw new \RuntimeException('Invalid token type', 401);
        }

        return $payload;
    }

    /**
     * Validate that a token is a refresh token.
     */
    public static function validateRefreshToken(string $token): array
    {
        $payload = self::decode($token);

        if (($payload['type'] ?? '') !== 'refresh') {
            throw new \RuntimeException('Invalid token type', 401);
        }

        return $payload;
    }
}
