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

    /**
     * POST /api/v1/ai/retrain
     * Retrain ML models using orders stored in the database.
     *
     * Exports all finalized orders (delivered, cancelled, returned) as a CSV,
     * sends it to the ML service for training, and returns the results.
     */
    public function retrainFromDatabase(Request $request): Response
    {
        $storeId = $request->storeId();

        // Query all orders with final statuses (needed for supervised learning)
        $orders = $this->db->query(
            "SELECT o.id,
                    o.status AS order_status,
                    o.created_at AS order_purchase_timestamp,
                    o.total_amount AS payment_value,
                    o.subtotal,
                    o.shipping_cost,
                    o.discount,
                    o.customer_phone AS customer_unique_id,
                    o.customer_name,
                    o.attempt_count,
                    w.name AS customer_state,
                    w.shipping_zone,
                    COUNT(oi.id) AS n_items,
                    GROUP_CONCAT(DISTINCT p.category SEPARATOR ',') AS product_category_name
             FROM orders o
             LEFT JOIN wilayas w ON o.wilaya_id = w.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE o.store_id = ?
               AND o.status IN ('delivered', 'cancelled', 'returned')
             GROUP BY o.id
             ORDER BY o.created_at ASC",
            [$storeId]
        );

        if (empty($orders)) {
            return Response::error(
                'No finalized orders found. Need delivered/cancelled/returned orders to train models. Minimum 100 orders recommended.',
                400
            );
        }

        if (count($orders) < 100) {
            return Response::error(
                'Only ' . count($orders) . ' finalized orders found. Minimum 100 orders recommended for meaningful training.',
                400
            );
        }

        // Map DB statuses to ML-expected statuses
        $statusMap = [
            'delivered'  => 'delivered',
            'cancelled'  => 'canceled',
            'returned'   => 'canceled',
        ];

        foreach ($orders as &$order) {
            $order['order_status'] = $statusMap[$order['order_status']] ?? $order['order_status'];
            // Default payment type for Algerian COD
            $order['payment_type'] = 'cod';
        }
        unset($order);

        // Generate CSV in temp file
        $tmpFile = tempnam(sys_get_temp_dir(), 'crm_retrain_');
        $csvPath = $tmpFile . '.csv';
        rename($tmpFile, $csvPath);

        $fp = fopen($csvPath, 'w');
        if (!$fp) {
            return Response::error('Failed to create temporary CSV file', 500);
        }

        // Write CSV header
        $headers = array_keys($orders[0]);
        fputcsv($fp, $headers);

        // Write rows
        foreach ($orders as $order) {
            fputcsv($fp, array_values($order));
        }
        fclose($fp);

        // Send CSV to ML service for training
        $result = $this->aiService->postFile('/api/retrain/upload-and-train', $csvPath);

        // Clean up temp file
        @unlink($csvPath);

        if (isset($result['success']) && $result['success'] === false) {
            return Response::error($result['error'] ?? 'ML training failed', 503);
        }

        // Include order count context in response
        $responseData = $result['data'] ?? $result;
        $responseData['source'] = 'database';
        $responseData['store_id'] = $storeId;

        return Response::success($responseData);
    }
}
