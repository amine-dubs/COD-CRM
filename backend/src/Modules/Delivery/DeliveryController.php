<?php

declare(strict_types=1);

namespace App\Modules\Delivery;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class DeliveryController
{
    private DeliveryService $service;

    public function __construct()
    {
        $this->service = new DeliveryService();
    }

    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $filters = [
            'status'     => $request->query('status'),
            'partner'    => $request->query('partner'),
            'wilaya_id'  => $request->query('wilaya_id'),
            'date_from'  => $request->query('date_from'),
            'date_to'    => $request->query('date_to'),
        ];

        $result = $this->service->list($request->storeId(), $page, $perPage, $filters);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    public function show(Request $request): Response
    {
        $delivery = $this->service->getById((int)$request->param('id'), $request->storeId());
        if (!$delivery) {
            return Response::notFound('Delivery not found');
        }
        return Response::success($delivery);
    }

    public function store(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('order_id')->integer('order_id')
          ->required('delivery_partner')->maxLength('delivery_partner', 100)
          ->maxLength('tracking_number', 100);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        try {
            $delivery = $this->service->create($request->storeId(), $request->authUserId(), $request->body());
        } catch (\InvalidArgumentException $e) {
            return Response::error($e->getMessage(), 403);
        }
        return Response::created($delivery, 'Delivery created successfully');
    }

    public function update(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->maxLength('delivery_partner', 100)
          ->maxLength('tracking_number', 100)
          ->maxLength('notes', 1000)
          ->numeric('shipping_cost')->min('shipping_cost', 0);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $delivery = $this->service->update(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body()
        );

        if (!$delivery) {
            return Response::notFound('Delivery not found');
        }

        return Response::success($delivery, 'Delivery updated successfully');
    }

    public function updateStatus(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('status')->in('status', ['pending', 'picked_up', 'in_transit', 'delivered', 'returned', 'failed']);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $delivery = $this->service->updateStatus(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body('status'),
            $request->authUserId()
        );

        if (!$delivery) {
            return Response::notFound('Delivery not found');
        }

        return Response::success($delivery, 'Delivery status updated');
    }

    public function destroy(Request $request): Response
    {
        $deleted = $this->service->delete((int)$request->param('id'), $request->storeId());
        if (!$deleted) {
            return Response::notFound('Delivery not found');
        }

        return Response::success(null, 'Delivery deleted successfully');
    }
}
