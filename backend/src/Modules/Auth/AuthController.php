<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class AuthController
{
    private AuthService $service;

    public function __construct()
    {
        $this->service = new AuthService();
    }

    /**
     * POST /api/v1/auth/register
     */
    public function register(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('name')->maxLength('name', 100)
          ->required('email')->email('email')
          ->required('password')->minLength('password', 8)
          ->required('store_name')->maxLength('store_name', 100)
          ->phone('phone');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $result = $this->service->register($request->body());
        return Response::created($result, 'Registration successful');
    }

    /**
     * POST /api/v1/auth/login
     */
    public function login(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('email')->email('email')
          ->required('password');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $result = $this->service->login(
            $request->body('email'),
            $request->body('password'),
            $request->body('store_id')
        );

        if (!$result) {
            return Response::unauthorized('Invalid credentials');
        }

        return Response::success($result, 'Login successful');
    }

    /**
     * POST /api/v1/auth/refresh
     */
    public function refresh(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('refresh_token');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $result = $this->service->refreshToken($request->body('refresh_token'));

        if (!$result) {
            return Response::unauthorized('Invalid refresh token');
        }

        return Response::success($result, 'Token refreshed');
    }

    /**
     * POST /api/v1/auth/logout (protected)
     */
    public function logout(Request $request): Response
    {
        // In a stateless JWT system, logout is client-side (discard token).
        // If using a token blocklist, add token here.
        return Response::success(null, 'Logged out successfully');
    }

    /**
     * GET /api/v1/auth/me (protected)
     */
    public function me(Request $request): Response
    {
        $user = $this->service->getProfile($request->authUserId(), $request->storeId());

        if (!$user) {
            return Response::notFound('User not found');
        }

        return Response::success($user);
    }
}
