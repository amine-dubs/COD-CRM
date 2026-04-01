<?php

declare(strict_types=1);

namespace App\Modules\Analytics;

use App\Core\Request;
use App\Core\Response;

class AnalyticsController
{
    private AnalyticsService $service;

    public function __construct()
    {
        $this->service = new AnalyticsService();
    }

    /**
     * GET /api/v1/analytics/dashboard
     */
    public function dashboard(Request $request): Response
    {
        $period = $request->query('period', '30d'); // 7d, 30d, 90d, 12m
        $stats = $this->service->getDashboardStats($request->storeId(), $period);
        return Response::success($stats);
    }

    /**
     * GET /api/v1/analytics/orders
     */
    public function orders(Request $request): Response
    {
        $period = $request->query('period', '30d');
        $stats = $this->service->getOrderAnalytics($request->storeId(), $period);
        return Response::success($stats);
    }

    /**
     * GET /api/v1/analytics/wilayas
     */
    public function wilayas(Request $request): Response
    {
        $period = $request->query('period', '30d');
        $stats = $this->service->getWilayaAnalytics($request->storeId(), $period);
        return Response::success($stats);
    }

    /**
     * GET /api/v1/analytics/products
     */
    public function products(Request $request): Response
    {
        $period = $request->query('period', '30d');
        $limit = (int)$request->query('limit', 10);
        $stats = $this->service->getTopProducts($request->storeId(), $period, $limit);
        return Response::success($stats);
    }

    /**
     * GET /api/v1/analytics/returns
     */
    public function returns(Request $request): Response
    {
        $period = $request->query('period', '30d');
        $stats = $this->service->getReturnAnalytics($request->storeId(), $period);
        return Response::success($stats);
    }

    /**
     * GET /api/v1/analytics/revenue
     */
    public function revenue(Request $request): Response
    {
        $period = $request->query('period', '30d');
        $groupBy = $request->query('group_by', 'day'); // day, week, month
        $stats = $this->service->getRevenueTimeline($request->storeId(), $period, $groupBy);
        return Response::success($stats);
    }
}
