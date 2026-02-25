<?php

declare(strict_types=1);

namespace App\Modules\User;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class UserController
{
    private UserService $service;

    public function __construct()
    {
        $this->service = new UserService();
    }

    /**
     * GET /api/v1/users
     */
    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $search  = $request->query('search');
        $role    = $request->query('role');

        $result = $this->service->list($request->storeId(), $page, $perPage, $search, $role);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    /**
     * GET /api/v1/users/{id}
     */
    public function show(Request $request): Response
    {
        $user = $this->service->getById((int)$request->param('id'), $request->storeId());
        if (!$user) {
            return Response::notFound('User not found');
        }
        return Response::success($user);
    }

    /**
     * POST /api/v1/users
     */
    public function store(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('name')->maxLength('name', 100)
          ->required('email')->email('email')
          ->required('password')->minLength('password', 8)
          ->required('role')->in('role', ['admin', 'order_confirmator', 'inventory_manager', 'accountant', 'delivery_manager'])
          ->phone('phone');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $user = $this->service->create($request->storeId(), $request->body());
        return Response::created($user, 'User created successfully');
    }

    /**
     * PUT /api/v1/users/{id}
     */
    public function update(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->maxLength('name', 100)
          ->email('email')
          ->in('role', ['admin', 'order_confirmator', 'inventory_manager', 'accountant', 'delivery_manager'])
          ->in('status', ['active', 'inactive'])
          ->phone('phone');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $user = $this->service->update((int)$request->param('id'), $request->storeId(), $request->body());
        if (!$user) {
            return Response::notFound('User not found');
        }
        return Response::success($user, 'User updated successfully');
    }

    /**
     * DELETE /api/v1/users/{id}
     */
    public function destroy(Request $request): Response
    {
        $deleted = $this->service->delete((int)$request->param('id'), $request->storeId());
        if (!$deleted) {
            return Response::notFound('User not found');
        }
        return Response::success(null, 'User deleted successfully');
    }
}
