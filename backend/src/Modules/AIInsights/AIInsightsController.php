<?php

declare(strict_types=1);

namespace App\Modules\AIInsights;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

class AIInsightsController
{
    private AIInsightsService $aiService;
    private Database $db;

    public function __construct()
    {
        $this->aiService = new AIInsightsService();
        $this->db = Database::getInstance();
    }

    /**
     * GET /api/v1/ai/health
     * Check ML service status.
     */
    public function health(Request $request): Response
    {
        $result = $this->aiService->healthCheck();
        return Response::success($result);
    }

    /**
     * GET /api/v1/ai/order-risk/{orderId}
     * Get risk score for a specific order.
     */
    public function orderRisk(Request $request, int $id): Response
    {
        $storeId = $request->storeId();

        // Fetch order data from database
        $order = $this->db->queryOne(
            "SELECT o.*, w.name as wilaya_name, w.shipping_zone,
                    COUNT(oi.id) as n_items,
                    GROUP_CONCAT(DISTINCT p.category) as product_categories
             FROM orders o
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.id = ? AND o.store_id = ?
             GROUP BY o.id",
            [$id, $storeId]
        );

        if (!$order) {
            return Response::error('Order not found', 404);
        }

        // Check customer history (only count delivered orders for clean metrics)
        $customerHistory = $this->db->queryOne(
            "SELECT COUNT(*) as order_count,
                    SUM(total_amount) as total_spent
             FROM orders
             WHERE store_id = ? AND customer_phone = ? AND id < ? AND status = 'delivered'",
            [$storeId, $order['customer_phone'], $id]
        );

        $orderCount    = (int)($customerHistory['order_count'] ?? 0);
        $totalSpent    = (float)($customerHistory['total_spent'] ?? 0);

        // Build payload for ML service
        $orderData = [
            'order_id'              => $order['id'],
            'customer_name'         => $order['customer_name'],
            'customer_phone'        => $order['customer_phone'],
            'wilaya_id'             => $order['wilaya_id'],
            'commune'               => $order['commune'],
            'subtotal'              => (float)$order['subtotal'],
            'shipping_cost'         => (float)$order['shipping_cost'],
            'total_amount'          => (float)$order['total_amount'],
            'n_items'               => (int)($order['n_items'] ?? 1),
            'product_category'      => $order['product_categories'] ?? 'unknown',
            'order_date'            => $order['created_at'],
            'is_repeat_customer'    => $orderCount > 0,
            'customer_order_count'  => $orderCount,
            'customer_total_spent'  => $totalSpent,
            'estimated_delivery_days' => 7,
            'payment_method'        => 'cod', // Default for Algerian COD e-commerce
        ];

        $result = $this->aiService->getOrderRisk($orderData);

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML service error', 503);
        }

        return Response::success($result['data'] ?? $result);
    }

    /**
     * GET /api/v1/ai/segments
     * Get customer segmentation.
     */
    public function segments(Request $request): Response
    {
        $result = $this->aiService->getSegmentSummary();

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML service error', 503);
        }

        return Response::success($result['data'] ?? $result);
    }

    /**
     * GET /api/v1/ai/forecast
     * Get demand forecast.
     */
    public function forecast(Request $request): Response
    {
        $category = $request->query('category', 'all');
        $periods  = (int)$request->query('periods', 30);

        $result = $this->aiService->getDemandForecast($category, $periods);

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML service error', 503);
        }

        return Response::success($result['data'] ?? $result);
    }

    /**
     * GET /api/v1/ai/insights
     * Get AI-generated business summary.
     */
    public function insights(Request $request): Response
    {
        $lang   = $request->query('lang', 'en');
        $period = $request->query('period', 'week');

        $result = $this->aiService->getInsightsSummary($lang, $period);

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML service error', 503);
        }

        return Response::success($result['data'] ?? $result);
    }

    /**
     * GET /api/v1/ai/recommendations
     * Get AI-powered business recommendations.
     */
    public function recommendations(Request $request): Response
    {
        $context = $request->query('context', 'General business performance overview');
        $lang    = $request->query('lang', 'en');

        $result = $this->aiService->getRecommendations($context, $lang);

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML service error', 503);
        }

        return Response::success($result['data'] ?? $result);
    }
}
