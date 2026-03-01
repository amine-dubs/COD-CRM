import type {
  ApiResponse,
  HealthStatus,
  OrderRiskRequest,
  RiskPredictionResult,
  ModelInfo,
  ForecastResult,
  TrainingMetrics,
  DataFormatInfo,
  RetrainingResult,
  InsightsSummary,
  RiskExplanation,
  RecommendationsResult,
} from "./types";

const ML_BASE_URL =
  process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8001";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${ML_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => fetchApi<HealthStatus>("/api/health"),

  predictOrderRisk: (data: OrderRiskRequest) =>
    fetchApi<ApiResponse<RiskPredictionResult>>("/api/predict/order-risk", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getModelInfo: () =>
    fetchApi<ApiResponse<ModelInfo>>("/api/predict/model-info"),

  getForecast: (category: string, periods: number) =>
    fetchApi<ApiResponse<ForecastResult>>(
      `/api/forecast/demand?category=${category}&periods=${periods}`
    ),

  getMetrics: () =>
    fetchApi<ApiResponse<TrainingMetrics>>("/api/retrain/metrics"),

  getDataFormat: () =>
    fetchApi<ApiResponse<DataFormatInfo>>("/api/retrain/data-format"),

  uploadAndTrain: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchApi<ApiResponse<RetrainingResult>>(
      "/api/retrain/upload-and-train",
      {
        method: "POST",
        body: formData,
        headers: {},
      }
    );
  },

  restoreDefaults: () =>
    fetchApi<ApiResponse<{ models_reloaded: boolean }>>(
      "/api/retrain/restore-defaults",
      { method: "POST" }
    ),

  // === LLM Insights (Gemini) ===
  getInsightsSummary: (lang: string = "en", period: string = "week") =>
    fetchApi<ApiResponse<InsightsSummary>>(
      `/api/insights/summary?lang=${lang}&period=${period}`
    ),

  explainOrderRisk: (score: number, reasons: string[], lang: string = "en") =>
    fetchApi<ApiResponse<RiskExplanation>>(
      `/api/insights/order-explanation?score=${score}&reasons=${encodeURIComponent(reasons.join(","))}&lang=${lang}`
    ),

  getRecommendations: (context: string, lang: string = "en") =>
    fetchApi<ApiResponse<RecommendationsResult>>(
      `/api/insights/recommendations?context=${encodeURIComponent(context)}&lang=${lang}`
    ),
};
