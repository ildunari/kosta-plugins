# Regression Tests Guide

1. Establish baselines from stable builds on CI.  
2. Store metric JSON snapshots.  
3. Compare using `scripts/regression_detector.py` with ±15% thresholds.  
4. Gate merges on no regressions in launch, scrolling, and memory metrics.  
