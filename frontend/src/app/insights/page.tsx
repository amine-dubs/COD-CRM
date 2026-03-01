"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Sparkles, Globe, FileText, Lightbulb } from "lucide-react";

type Lang = "en" | "fr" | "ar";
type Period = "day" | "week" | "month";

const LANG_LABELS: Record<Lang, string> = { en: "English", fr: "Fran\u00e7ais", ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" };
const PERIOD_LABELS: Record<Period, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

export default function InsightsPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [period, setPeriod] = useState<Period>("week");
  const [summary, setSummary] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [context, setContext] = useState(
    "COD e-commerce business in Algeria with 30-50% order failure rate. Looking to improve delivery success and reduce returns."
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummary = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await api.getInsightsSummary(lang, period);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleRecommendations = async () => {
    setLoadingRecs(true);
    setError(null);
    try {
      const res = await api.getRecommendations(context, lang);
      setRecommendations(res.data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recommendations");
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          AI Insights
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Powered by Google Gemini 2.0 Flash — multilingual business intelligence
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Language & Period Controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Language:</span>
            <div className="flex gap-1">
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    lang === l
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</span>
            <div className="flex gap-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Summary */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Business Summary
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            AI-generated analysis of your business performance, key highlights, and areas of concern.
          </p>
          <Button onClick={handleSummary} isLoading={loadingSummary} className="w-full mb-4">
            Generate {PERIOD_LABELS[period]} Summary
          </Button>
          {summary && (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg ${
                lang === "ar" ? "text-right" : ""
              }`}
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {summary}
              </div>
            </div>
          )}
        </Card>

        {/* Recommendations */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recommendations
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Describe your business context and get AI-powered actionable recommendations.
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 resize-none"
            placeholder="Describe your business situation..."
          />
          <Button
            onClick={handleRecommendations}
            isLoading={loadingRecs}
            disabled={!context.trim()}
            className="w-full mb-4"
          >
            Get Recommendations
          </Button>
          {recommendations && (
            <div
              className={`prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg ${
                lang === "ar" ? "text-right" : ""
              }`}
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {recommendations}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
