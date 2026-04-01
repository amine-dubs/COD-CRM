<?php

declare(strict_types=1);

namespace App\Modules\Inventory;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class InventoryController
{
    private InventoryService $service;

    public function __construct()
    {
        $this->service = new InventoryService();
    }

    /**
     * GET /api/v1/inventory
     */
    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $filters = [
            'search'    => $request->query('search'),
            'low_stock' => $request->query('low_stock') === 'true',
        ];

        $result = $this->service->list($request->storeId(), $page, $perPage, $filters);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    /**
     * POST /api/v1/inventory/adjust
     */
    public function adjust(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('product_id')->integer('product_id')
          ->required('quantity')->integer('quantity')
          ->required('type')->in('type', ['add', 'subtract', 'set'])
          ->maxLength('reason', 500);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $result = $this->service->adjust(
            $request->storeId(),
            (int)$request->body('product_id'),
            (int)$request->body('quantity'),
            $request->body('type'),
            $request->body('reason'),
            $request->authUserId()
        );

        return Response::success($result, 'Inventory adjusted successfully');
    }

    /**
     * GET /api/v1/inventory/{productId}/history
     */
    public function history(Request $request): Response
    {
        $history = $this->service->getHistory(
            $request->storeId(),
            (int)$request->param('productId')
        );
        return Response::success($history);
    }

    /**
     * GET /api/v1/inventory/alerts
     */
    public function alerts(Request $request): Response
    {
        $alerts = $this->service->getLowStockAlerts($request->storeId());
        return Response::success($alerts);
    }
}
