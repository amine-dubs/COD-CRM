<?php

declare(strict_types=1);

namespace App\Modules\Order;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class OrderController
{
    private OrderService $service;

    public function __construct()
    {
        $this->service = new OrderService();
    }

    /**
     * GET /api/v1/orders
     */
    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $filters = [
            'status'      => $request->query('status'),
            'wilaya_id'   => $request->query('wilaya_id'),
            'date_from'   => $request->query('date_from'),
            'date_to'     => $request->query('date_to'),
            'search'      => $request->query('search'),
        ];

        $result = $this->service->list($request->storeId(), $page, $perPage, $filters);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    /**
     * GET /api/v1/orders/{id}
     */
    public function show(Request $request): Response
    {
        $order = $this->service->getById((int)$request->param('id'), $request->storeId());
        if (!$order) {
            return Response::notFound('Order not found');
        }
        return Response::success($order);
    }

    /**
     * POST /api/v1/orders
     */
    public function store(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('customer_name')->maxLength('customer_name', 100)
          ->required('customer_phone')->phone('customer_phone')
          ->required('wilaya_id')->integer('wilaya_id')
          ->required('commune')->maxLength('commune', 100)
          ->required('address')->maxLength('address', 500)
          ->required('items')->array('items')
          ->numeric('shipping_cost')
          ->maxLength('notes', 1000);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $order = $this->service->create($request->storeId(), $request->authUserId(), $request->body());
        return Response::created($order, 'Order created successfully');
    }

    /**
     * PUT /api/v1/orders/{id}
     */
    public function update(Request $request): Response
    {
        $order = $this->service->update(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body()
        );
        if (!$order) {
            return Response::notFound('Order not found');
        }
        return Response::success($order, 'Order updated successfully');
    }

    /**
     * PATCH /api/v1/orders/{id}/status
     */
    public function updateStatus(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('status')->in('status', [
            'new', 'confirmed', 'processing', 'shipped', 'delivered',
            'returned', 'cancelled', 'no_answer', 'postponed'
        ]);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $order = $this->service->updateStatus(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body('status'),
            $request->authUserId()
        );

        if (!$order) {
            return Response::notFound('Order not found');
        }

        return Response::success($order, 'Order status updated');
    }

    /**
     * DELETE /api/v1/orders/{id}
     */
    public function destroy(Request $request): Response
    {
        $deleted = $this->service->delete((int)$request->param('id'), $request->storeId());
        if (!$deleted) {
            return Response::notFound('Order not found');
        }
        return Response::success(null, 'Order deleted successfully');
    }
}
