Dear Dr. Khellat, Assalamualaikum and Saha ftourouk, I hope this email finds you well.

We are writing to present the AI integration approaches and performance metrics for our CRM. We would appreciate your feedback on our methodology and results.

1. Delivery Risk Prediction (Ensemble: CatBoost + LightGBM + XGBoost, optimized):
- AUC-ROC: **0.9961** (honest metric, no data leakage — 3 leaked features identified and removed, then model systematically optimized)
- 4-step optimization: clean target definition → enhanced features (31) → ADASYN resampling → Optuna hyperparameter tuning (80 trials)
- Key result: **98% recall** on failure detection (242/247 failures detected), **100% precision** (0 false negatives, only 5 false positives)
- Confusion matrix: TN=242, FP=5, FN=0, TP=19,296 (out of 19,543 test samples)
- 31 engineered features across 8 categories (temporal, value, items, customer, payment, product quality, geography, category)
- Clean target: only final-status orders (delivered vs canceled/unavailable), excluding in-progress orders

2. Customer Segmentation (HDBSCAN on RFM metrics):
- 5 profiles identified automatically: VIP (3.8%), Loyal (0.3%), At Risk (2.8%), Lost (0.5%), Standard (92.6%)

3. Demand Forecasting (LightGBM + Islamic Calendar covariates):
- Selected after benchmarking 5 covariate-aware models (MA, Prophet, Chronos, LightGBM)
- **+12.2% MAE improvement** over moving average baseline (MAE: 318,741 DZD)
- 19 covariates: Ramadan, Eid al-Fitr, Eid al-Adha, Mawlid (via hijri-converter), calendar features, lags, rolling statistics
- Why not foundation models (Chronos, TimesFM, MOIRAI, Lag-Llama)? They are zero-shot and don't accept covariates. Our advantage is Islamic calendar-aware forecasting, which requires covariate support. LightGBM handles 19 covariates natively, retrains in seconds, and outperforms on our small dataset (714 days).

4. Multilingual Insights (LLM):
- Provider: Google Gemini 2.5-Flash
- Languages: Arabic, French, English

5. Model Retraining API:
- Companies can retrain all models directly from their CRM database (one-click, no CSV needed)
- The system automatically extracts finalized orders, generates the expected format, and retrains
- **Automatic Optuna hyperparameter optimization** (40 Bayesian trials) adapts model parameters to the company's real data
- CSV upload also supported as alternative method
- Automatic backup and rollback, minimum 4 required columns + 13 optional columns for enhanced accuracy
- The feature engineering is applied automatically to imported data

All metrics are computed on a held-out test set (no training data contamination). We welcome your feedback on these approaches.

This link has a look of the work (old metrics), initial design, I'll integrate it with the current app frontend later because Soltane hasn't pushed it yet:
https://drive.google.com/file/d/1DheDcwYigGHpU9ky7KRqrXo3rfvfhGYm/view?usp=sharing

Github no ai:https://github.com/soltane1414/COD-CRM
Ai integration:


Best regards,
Bellatreche Mohamed Amine
