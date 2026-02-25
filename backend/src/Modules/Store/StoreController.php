<?php

declare(strict_types=1);

namespace App\Modules\Store;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class StoreController
{
    private StoreService $service;

    public function __construct()
    {
        $this->service = new StoreService();
    }

    /**
     * GET /api/v1/store
     */
    public function show(Request $request): Response
    {
        $store = $this->service->getStore($request->storeId());
        if (!$store) {
            return Response::notFound('Store not found');
        }
        return Response::success($store);
    }

    /**
     * PUT /api/v1/store
     */
    public function update(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->maxLength('name', 100)
          ->maxLength('phone', 20)
          ->maxLength('address', 255);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $store = $this->service->updateStore($request->storeId(), $request->body());
        return Response::success($store, 'Store updated successfully');
    }

    /**
     * GET /api/v1/store/stats
     */
    public function stats(Request $request): Response
    {
        $stats = $this->service->getStoreStats($request->storeId());
        return Response::success($stats);
    }
}
