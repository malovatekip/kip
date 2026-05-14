"""
KIP ML Prediction Engine — Sprint 6
Lightweight machine learning predictions using scikit-learn.
Runs on the server. On-device TensorFlow integration is a post-deploy roadmap item.

Models used:
- Linear Regression: revenue forecasting
- Simple moving statistics: trend detection, anomaly detection
- Rule-based: stock depletion, break-even tracking
"""

import json
import math
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

try:
    import numpy as np
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("[ML] scikit-learn not installed. Run: pip install scikit-learn numpy")


def _to_float(v, default=0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default


# ── Revenue Forecasting ────────────────────────────────────────────────────

def forecast_revenue_7d(logs: List[Dict]) -> Tuple[List[float], float]:
    """
    Forecast next 7 days of revenue using linear regression + day-of-week seasonality.
    Returns (forecast_list, confidence_score 0-1).
    Requires at least 7 logs for meaningful output.
    """
    if len(logs) < 5:
        # Not enough data — return flat estimate based on average
        avg = sum(_to_float(l.get('total_revenue')) for l in logs) / max(len(logs), 1)
        return [round(avg, 2)] * 7, 0.3

    if not SKLEARN_AVAILABLE:
        # Fallback: simple moving average
        recent = [_to_float(l.get('total_revenue')) for l in logs[-7:]]
        avg = sum(recent) / len(recent)
        return [round(avg, 2)] * 7, 0.4

    revenues = [_to_float(l.get('total_revenue')) for l in logs]
    n = len(revenues)

    # Features: [day_index, day_of_week_sin, day_of_week_cos]
    # Day-of-week encoded cyclically so Sunday connects to Saturday
    X, y = [], []
    for i, log in enumerate(logs):
        log_date = log.get('log_date')
        if isinstance(log_date, str):
            try:
                log_date = datetime.fromisoformat(log_date.replace('Z', ''))
            except Exception:
                log_date = datetime.utcnow() - timedelta(days=n - i)
        elif log_date is None:
            log_date = datetime.utcnow() - timedelta(days=n - i)

        dow = log_date.weekday() if hasattr(log_date, 'weekday') else i % 7
        X.append([
            i,
            math.sin(2 * math.pi * dow / 7),
            math.cos(2 * math.pi * dow / 7),
        ])
        y.append(revenues[i])

    try:
        model = LinearRegression()
        model.fit(X, y)

        # R² score as confidence proxy
        y_pred_train = model.predict(X)
        ss_res = sum((a - b) ** 2 for a, b in zip(y, y_pred_train))
        ss_tot = sum((a - sum(y) / len(y)) ** 2 for a in y)
        r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        confidence = max(0.2, min(0.95, (r2 + 0.5) / 1.5))  # scale to 0.2-0.95

        # Predict next 7 days
        last_log = logs[-1]
        last_date = last_log.get('log_date')
        if isinstance(last_date, str):
            try:
                last_date = datetime.fromisoformat(last_date.replace('Z', ''))
            except Exception:
                last_date = datetime.utcnow()
        elif last_date is None:
            last_date = datetime.utcnow()

        forecast = []
        for d in range(1, 8):
            future = last_date + timedelta(days=d)
            dow = future.weekday()
            pred = model.predict([[n + d - 1,
                                   math.sin(2 * math.pi * dow / 7),
                                   math.cos(2 * math.pi * dow / 7)]])[0]
            forecast.append(max(0, round(pred, 2)))

        return forecast, round(confidence, 2)

    except Exception as e:
        print(f"[ML] Forecast error: {e}")
        avg = sum(revenues[-7:]) / min(7, len(revenues))
        return [round(avg, 2)] * 7, 0.3


# ── Customer Trend Detection ───────────────────────────────────────────────

def detect_customer_trend(logs: List[Dict]) -> Tuple[str, float]:
    """
    Detect whether customer count is rising, stable, or falling.
    Compares last 7 days vs the 7 days before that.
    Returns (trend_label, change_percentage).
    """
    if len(logs) < 5:
        return "stable", 0.0

    customers = [_to_float(l.get('total_customers')) for l in logs]

    if len(customers) >= 14:
        recent = sum(customers[-7:]) / 7
        prev   = sum(customers[-14:-7]) / 7
    else:
        mid = len(customers) // 2
        recent = sum(customers[mid:]) / max(len(customers[mid:]), 1)
        prev   = sum(customers[:mid]) / max(mid, 1)

    if prev == 0:
        return "stable", 0.0

    change = ((recent - prev) / prev) * 100

    if change > 8:
        return "rising", round(change, 1)
    elif change < -8:
        return "falling", round(change, 1)
    else:
        return "stable", round(change, 1)


# ── Peak Day Detection ─────────────────────────────────────────────────────

def detect_peak_day(logs: List[Dict]) -> str:
    """
    Determine which day of the week consistently has the highest revenue.
    Requires at least 14 logs (2 weeks) for meaningful output.
    """
    if len(logs) < 7:
        return "Insufficient data"

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_totals = [0.0] * 7
    day_counts = [0] * 7

    for log in logs:
        log_date = log.get('log_date')
        if isinstance(log_date, str):
            try:
                log_date = datetime.fromisoformat(log_date.replace('Z', ''))
            except Exception:
                continue
        if log_date and hasattr(log_date, 'weekday'):
            dow = log_date.weekday()
            day_totals[dow] += _to_float(log.get('total_revenue'))
            day_counts[dow] += 1

    # Calculate averages
    day_avgs = []
    for i in range(7):
        avg = day_totals[i] / day_counts[i] if day_counts[i] > 0 else 0
        day_avgs.append(avg)

    peak_idx = day_avgs.index(max(day_avgs))
    return day_names[peak_idx]


# ── Expense Anomaly Detection ──────────────────────────────────────────────

def detect_expense_anomaly(logs: List[Dict]) -> Tuple[bool, str, str]:
    """
    Flag when total expenses spike significantly vs the rolling average.
    Returns (is_anomaly, category, detail_message).
    """
    if len(logs) < 7:
        return False, "", ""

    expenses = [_to_float(l.get('total_expenses')) for l in logs]
    recent_expense = expenses[-1]
    baseline = sum(expenses[:-1]) / len(expenses[:-1])

    if baseline == 0:
        return False, "", ""

    ratio = recent_expense / baseline

    if ratio > 1.8:  # 80% above average
        return (
            True,
            "total_expenses",
            f"Today's expenses (K{recent_expense:.0f}) are {((ratio-1)*100):.0f}% above your average (K{baseline:.0f}). Review what drove this spike."
        )

    # Check expense breakdown anomaly
    for log in [logs[-1]]:
        breakdown_str = log.get('expense_breakdown')
        if not breakdown_str:
            continue
        try:
            breakdown = json.loads(breakdown_str) if isinstance(breakdown_str, str) else breakdown_str
            # If any single category > 60% of total expenses
            for cat, amt in breakdown.items():
                amt_f = _to_float(amt)
                if recent_expense > 0 and amt_f / recent_expense > 0.6:
                    return (
                        True,
                        cat,
                        f"{cat.title()} accounted for {(amt_f/recent_expense*100):.0f}% of today's expenses (K{amt_f:.0f}). Is this expected?"
                    )
        except Exception:
            pass

    return False, "", ""


# ── Stock Depletion Predictor ──────────────────────────────────────────────

def predict_stockout(logs: List[Dict]) -> Tuple[Optional[int], List[str]]:
    """
    Estimate days until stock runs out based on recent log patterns.
    Returns (days_until_stockout, [low_stock_items]).
    """
    if len(logs) < 3:
        return None, []

    # Check recent stock_status entries
    recent_statuses = [l.get('stock_status', 'sufficient') for l in logs[-5:]]

    low_count = sum(1 for s in recent_statuses if s in ('low', 'critical'))

    if low_count == 0:
        return None, []

    # Estimate days based on trajectory
    if recent_statuses[-1] == 'critical':
        return 2, ["Main stock items"]
    elif recent_statuses[-1] == 'low':
        days = max(3, 7 - low_count * 2)
        return days, ["Main stock items"]
    elif low_count >= 2:
        return 5, ["Main stock items"]

    return None, []


# ── Break-Even Tracker ─────────────────────────────────────────────────────

def calculate_breakeven_progress(
    logs: List[Dict],
    projected_monthly_profit: float
) -> Tuple[float, Optional[int]]:
    """
    Calculate how close the business is to its break-even / profit target.
    Returns (progress_percentage, estimated_days_to_breakeven).
    """
    if not logs or not projected_monthly_profit:
        return 0.0, None

    # Calculate current daily average net
    profits = [_to_float(l.get('daily_profit')) for l in logs[-14:]]
    avg_daily = sum(profits) / len(profits) if profits else 0

    # Monthly equivalent
    monthly_equivalent = avg_daily * 30

    if projected_monthly_profit <= 0:
        return 100.0, 0

    progress = min(100.0, (monthly_equivalent / projected_monthly_profit) * 100)

    # Estimate days to reach target
    if avg_daily > 0:
        daily_target = projected_monthly_profit / 30
        if avg_daily >= daily_target:
            days_needed = 0
        else:
            # Simple projection — how many more days to build up to target rate
            days_needed = max(1, int((daily_target - avg_daily) / max(avg_daily * 0.02, 0.01)))
            days_needed = min(days_needed, 180)  # cap at 6 months
    else:
        days_needed = None

    return round(progress, 1), days_needed


# ── Master prediction runner ───────────────────────────────────────────────

def run_all_predictions(
    logs: List[Dict],
    projected_monthly_profit: float = 0
) -> Dict:
    """
    Run all ML predictions for a business and return combined results dict.
    This is called after every log submission.
    """
    results = {
        "generated_at": datetime.utcnow().isoformat(),
        "log_count": len(logs),
    }

    # Revenue forecast
    forecast, confidence = forecast_revenue_7d(logs)
    results["revenue_forecast_7d"] = json.dumps(forecast)
    results["forecast_confidence"] = confidence

    # Customer trend
    trend, change = detect_customer_trend(logs)
    results["customer_trend"] = trend
    results["customer_trend_pct"] = change

    # Peak day
    results["peak_day_of_week"] = detect_peak_day(logs)

    # Stock depletion
    days_out, low_items = predict_stockout(logs)
    results["days_until_stockout"] = days_out
    results["low_stock_items"] = json.dumps(low_items)

    # Expense anomaly
    anomaly, cat, detail = detect_expense_anomaly(logs)
    results["expense_anomaly"] = anomaly
    results["anomaly_category"] = cat
    results["anomaly_detail"] = detail

    # Break-even
    progress, days_to_be = calculate_breakeven_progress(logs, projected_monthly_profit)
    results["breakeven_progress_pct"] = progress
    results["days_to_breakeven"] = days_to_be

    return results
