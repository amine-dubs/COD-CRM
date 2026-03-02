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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${ML_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {};
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function fetchBackendApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {};
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  // Include auth token if available
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.detail || `API error: ${res.status}`);
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

  retrainFromDatabase: () =>
    fetchBackendApi<ApiResponse<RetrainingResult>>(
      "/api/v1/ai/retrain",
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
