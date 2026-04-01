<?php

declare(strict_types=1);

namespace App\Modules\Storefront;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

/**
 * Public Storefront Controller
 * 
 * These endpoints are PUBLIC — no authentication required.
 * Used by the storefront pages (subdomain or /store/{slug}).
 */
class StorefrontController
{
    private StorefrontService $service;

    public function __construct()
    {
        $this->service = new StorefrontService();
    }

    /**
     * GET /api/v1/storefront/{slug}
     * Get store info by slug
     */
    public function storeInfo(Request $request): Response
    {
        $slug = $request->param('slug');
        if (!$slug) {
            return Response::error('Store slug is required', 400);
        }

        $store = $this->service->getStoreBySlug($slug);
        if (!$store) {
            return Response::notFound('Store not found');
        }

        return Response::success($store);
    }

    /**
     * GET /api/v1/storefront/{slug}/products
     * Get active products for the store
     */
    public function products(Request $request): Response
    {
        $slug = $request->param('slug');
        if (!$slug) {
            return Response::error('Store slug is required', 400);
        }

        $products = $this->service->getProducts($slug);
        if ($products === null) {
            return Response::notFound('Store not found');
        }

        return Response::success($products);
    }

    /**
     * POST /api/v1/storefront/{slug}/orders
     * Create a new order from the public storefront
     */
    public function placeOrder(Request $request): Response
    {
        $slug = $request->param('slug');
        if (!$slug) {
            return Response::error('Store slug is required', 400);
        }

        $v = new Validator($request->body());
        $v->required('customer_name')->maxLength('customer_name', 100)
          ->required('customer_phone')->phone('customer_phone')
          ->required('wilaya_id')->integer('wilaya_id')
          ->required('commune')->maxLength('commune', 100)
          ->required('address')->maxLength('address', 500)
          ->required('items')->array('items')
          ->maxLength('notes', 1000);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        try {
            $order = $this->service->placeOrder($slug, $request->body());
            return Response::created($order, 'Order placed successfully');
        } catch (\Exception $e) {
            return Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
