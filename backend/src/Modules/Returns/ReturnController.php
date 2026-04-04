<?php

declare(strict_types=1);

namespace App\Modules\Returns;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class ReturnController
{
    private ReturnService $service;

    public function __construct()
    {
        $this->service = new ReturnService();
    }

    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $filters = [
            'status' => $request->query('status'),
            'reason' => $request->query('reason'),
        ];

        $result = $this->service->list($request->storeId(), $page, $perPage, $filters);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    public function show(Request $request): Response
    {
        $return = $this->service->getById((int)$request->param('id'), $request->storeId());
        if (!$return) {
            return Response::notFound('Return not found');
        }
        return Response::success($return);
    }

    public function store(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('order_id')->integer('order_id')
          ->required('reason')->in('reason', [
              'customer_refused', 'wrong_address', 'not_reachable',
              'damaged', 'wrong_product', 'duplicate', 'other'
          ])
          ->maxLength('notes', 1000);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        try {
            $return = $this->service->create($request->storeId(), $request->authUserId(), $request->body());
        } catch (\InvalidArgumentException $e) {
            return Response::error($e->getMessage(), 403);
        }
        return Response::created($return, 'Return recorded successfully');
    }

    public function update(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->in('reason', [
              'customer_refused', 'wrong_address', 'not_reachable',
              'damaged', 'wrong_product', 'duplicate', 'other'
          ])
          ->maxLength('notes', 1000);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $return = $this->service->update(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body()
        );

        if (!$return) {
            return Response::notFound('Return not found');
        }

        return Response::success($return, 'Return updated successfully');
    }

    public function updateStatus(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('status')->in('status', ['pending', 'processing', 'completed', 'restocked']);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $return = $this->service->updateStatus(
            (int)$request->param('id'),
            $request->storeId(),
            $request->body('status'),
            $request->authUserId()
        );

        if (!$return) {
            return Response::notFound('Return not found');
        }

        return Response::success($return, 'Return status updated');
    }

    public function destroy(Request $request): Response
    {
        $deleted = $this->service->delete((int)$request->param('id'), $request->storeId());
        if (!$deleted) {
            return Response::notFound('Return not found');
        }

        return Response::success(null, 'Return deleted successfully');
    }
}
