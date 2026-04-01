<?php

declare(strict_types=1);

namespace App\Modules\Product;

use App\Core\Request;
use App\Core\Response;
use App\Core\Helpers\Validator;

class ProductController
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    public function index(Request $request): Response
    {
        $page    = (int)$request->query('page', 1);
        $perPage = (int)$request->query('per_page', 25);
        $filters = [
            'search'   => $request->query('search'),
            'status'   => $request->query('status'),
            'category' => $request->query('category'),
        ];

        $result = $this->service->list($request->storeId(), $page, $perPage, $filters);
        return Response::paginated($result['data'], $result['total'], $page, $perPage);
    }

    public function show(Request $request): Response
    {
        $product = $this->service->getById((int)$request->param('id'), $request->storeId());
        if (!$product) {
            return Response::notFound('Product not found');
        }
        return Response::success($product);
    }

    public function store(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->required('name')->maxLength('name', 200)
          ->required('price')->numeric('price')->min('price', 0)
          ->maxLength('sku', 50)
          ->maxLength('category', 100)
          ->numeric('cost_price')
          ->numeric('weight');

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $product = $this->service->create($request->storeId(), $request->body());
        return Response::created($product, 'Product created successfully');
    }

    public function update(Request $request): Response
    {
        $v = new Validator($request->body());
        $v->maxLength('name', 200)
          ->numeric('price')
          ->maxLength('sku', 50)
          ->in('status', ['active', 'inactive', 'draft']);

        if ($v->fails()) {
            return Response::validationError($v->errors());
        }

        $product = $this->service->update((int)$request->param('id'), $request->storeId(), $request->body());
        if (!$product) {
            return Response::notFound('Product not found');
        }
        return Response::success($product, 'Product updated successfully');
    }

    public function destroy(Request $request): Response
    {
        $deleted = $this->service->delete((int)$request->param('id'), $request->storeId());
        if (!$deleted) {
            return Response::notFound('Product not found');
        }
        return Response::success(null, 'Product deleted successfully');
    }
}
