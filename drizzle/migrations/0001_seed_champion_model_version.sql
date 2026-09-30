-- Real measured results of the champion model (UCI Statlog German Credit,
-- 600/200/200 stratified split, selected on validation PR-AUC).
INSERT INTO public.model_versions (version, algorithm, roc_auc, pr_auc, metrics, notes)
VALUES (
  'v1.0.0',
  'xgboost_weighted',
  0.770952380952381,
  0.5695451266798351,
  '{
     "split": "test",
     "accuracy": 0.705,
     "precision": 0.5074626865671642,
     "recall": 0.5666666666666667,
     "f1": 0.5354330708661418,
     "brier_score": 0.18981781601905823,
     "threshold": 0.5,
     "confusion_matrix": {"true_negative": 107, "false_positive": 33, "false_negative": 26, "true_positive": 34},
     "validation_pr_auc": 0.7038
   }'::jsonb,
  'XGBoost with scale_pos_weight. Selected on validation PR-AUC; protected attributes excluded; probabilities uncalibrated.'
)
ON CONFLICT (version) DO NOTHING;
