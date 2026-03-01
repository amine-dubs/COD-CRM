// === API Response Wrapper ===
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// === Health ===
export interface HealthStatus {
  status: "ok" | "error";
  service: string;
  version: string;
}

// === Risk Prediction ===
export interface OrderRiskRequest {
  order_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_phone_2?: string;
  wilaya_id?: number;
  customer_state?: string;
  commune?: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total_amount: number;
  n_items: number;
  product_category?: string;
  source?: string;
  order_date?: string;
  is_repeat_customer: boolean;
  customer_order_count: number;
  customer_success_rate: number;
  estimated_delivery_days: number;
  avg_product_weight: number;
}

export type RiskCategory = "critical" | "high" | "medium" | "low";

export interface RiskPredictionResult {
  score: number;
  category: RiskCategory;
  success_probability: number;
  reasons: string[];
  recommendation: string;
  model_scores: Record<string, number>;
}

export interface ModelInfo {
  model_loaded: boolean;
  features: string[];
  risk_categories: RiskCategory[];
}

// === Segmentation ===
export interface SegmentMetricEntry {
  count: number;
  percentage: number;
  avg_recency: number;
  avg_frequency: number;
  avg_monetary: number;
}

// === Forecasting ===
export interface ForecastPrediction {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface ForecastResult {
  category: string;
  periods: number;
  predictions: ForecastPrediction[];
}

// === Metrics ===
export interface ModelMetric {
  auc_roc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface ConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface RiskMetrics {
  models: Record<string, ModelMetric>;
  ensemble_weights: Record<string, number>;
  confusion_matrix: ConfusionMatrix;
  dataset: {
    total_samples: number;
    train_samples: number;
    test_samples: number;
    positive_rate: number;
  };
  features: string[];
}

export interface SegmentationMetrics {
  algorithm: string;
  n_clusters: number;
  total_customers: number;
  segments: Record<string, SegmentMetricEntry>;
}

export interface ForecastingMetrics {
  models_trained: string[];
  method: string;
  prophet: { mae: number; rmse: number };
  baseline_moving_avg: { mae: number; rmse: number };
  improvement_mae_pct: number;
  time_series_days: number;
  test_days: number;
}

export interface TrainingMetrics {
  trained_at: string;
  dataset: string;
  total_orders: number;
  delivery_rate: number;
  risk_prediction: RiskMetrics;
  segmentation: SegmentationMetrics;
  forecasting: ForecastingMetrics;
}

// === Retraining ===
export interface DataFormatInfo {
  required_columns: Record<string, string>;
  optional_columns: Record<string, string>;
  notes: string[];
}

export interface RetrainingResult {
  orders_processed: number;
  delivery_rate: number;
  risk_auc: number;
  risk_f1: number;
  segments_found: number;
  forecast_models: number;
  models_reloaded: boolean;
  backup_location: string;
}
