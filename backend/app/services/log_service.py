"""
KIP Enhanced Log Service — Sprint 6
Handles: adaptive template generation, coaching, weekly reviews.
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import anthropic

from app.services.ml_engine import run_all_predictions
from app.routes.language_support import language_instruction

COACHING_PROMPT = """
You are KIP — the Kwacha Intelligence Platform — acting as a daily business performance coach.

You have access to a comprehensive daily log and ML-derived predictions.
Your coaching must:
- Reference ACTUAL numbers from the log — never generic advice
- Identify ONE specific pattern from the data
- Give ONE clear priority for tomorrow
- Be warm, direct, and brief (under 320 words)
- Use ZMW for all amounts

OUTPUT FORMAT — use EXACTLY this structure:

📊 **TODAY'S SNAPSHOT**
Revenue: K[X] | Expenses: K[X] | Profit: K[X] | Customers: [X]

🔍 **PATTERN KIP NOTICED**
[One specific, data-backed observation with actual numbers]

⭐ **TOMORROW'S ONE PRIORITY**
[Specific, achievable action directly linked to the pattern above]

[Only include if relevant:]
📦 **STOCK ALERT** — [Specific restocking advice]
🔧 **ON YOUR PROBLEM** — [Direct response to logged problem]
⚠️ **COST SPIKE** — [Response to expense anomaly]

✅ **WELL DONE TODAY**
[One positive observation with specific evidence from the numbers]
"""

LOG_TEMPLATE_PROMPT = """
You are KIP. A user has started a business and needs a customised daily log template.

Based on the business type and description, define custom sub-fields for each of the
5 log categories. Keep it simple — 2 to 4 custom items per category maximum.

Return ONLY valid JSON in this exact structure:
{
  "business_type": "string",
  "custom_metric_name": "string (the main operational unit, e.g. 'Devices Repaired', 'Plates Sold')",
  "revenue_products": ["product1", "product2", "product3"],
  "expense_categories": ["category1", "category2", "category3", "category4"],
  "operations_metrics": ["metric1", "metric2"],
  "marketing_channels": ["channel1", "channel2", "channel3"]
}
"""

WEEKLY_REVIEW_PROMPT = """
You are KIP — daily business coach. You are generating a weekly performance review.

Write a 250-300 word narrative weekly review for a Zambian entrepreneur.
Structure it as:

📅 **WEEK IN REVIEW**

**Performance:** [2-3 sentences on overall week — reference actual numbers]

**What the numbers say:** [Pattern from the 7 weekly KPIs — specific insight]

**This week's win:** [Best thing that happened — with evidence]

**Watch this closely:** [One risk or weakness that needs attention next week]

**KIP's recommendation for next week:** [One specific strategic action]

Be encouraging but honest. Reference actual ZMW figures throughout.
"""


async def generate_log_template(
    business_name: str,
    business_idea_response: str
) -> Dict:
    """
    Generate a semi-adaptive log template based on the business type.
    KIP reads the original recommendation and creates custom fields.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        return _default_template(business_name)

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=LOG_TEMPLATE_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Business: {business_name}\n\nOriginal recommendation:\n{business_idea_response[:800]}"
            }]
        )
        raw = response.content[0].text.strip()
        # Strip markdown fences
        if '```' in raw:
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"[Log Template] Error: {e}")
        return _default_template(business_name)


def _default_template(business_name: str) -> Dict:
    return {
        "business_type": business_name,
        "custom_metric_name": "Units Sold",
        "revenue_products": ["Main product/service", "Secondary product", "Other"],
        "expense_categories": ["Stock/supplies", "Transport", "Marketing", "Other"],
        "operations_metrics": ["Hours open", "Units produced"],
        "marketing_channels": ["WhatsApp", "Facebook", "Word of mouth", "Walk-ins"],
    }


async def generate_daily_coaching(
    log_data: Dict,
    recent_logs: List[Dict],
    ml_predictions: Dict,
    business_name: str,
    user_name: str,
    projected_monthly_profit: float = 0,
    lang: str ="en"
) -> str:
    """
    Generate personalised daily coaching after a log submission.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _placeholder_coaching(log_data, business_name)

    # Build data summary for Claude
    day_num = len(recent_logs)
    revenue = log_data.get('total_revenue', 0)
    expenses = log_data.get('total_expenses', 0)
    profit = revenue - expenses
    customers = log_data.get('total_customers', 0)

    # Recent revenue history (last 7)
    rev_history = [f"K{l.get('total_revenue',0):.0f}" for l in recent_logs[-7:]]

    ml_notes = []
    if ml_predictions.get('customer_trend') == 'falling':
        ml_notes.append(f"Customer trend: FALLING ({ml_predictions.get('customer_trend_pct',0):.1f}%)")
    elif ml_predictions.get('customer_trend') == 'rising':
        ml_notes.append(f"Customer trend: RISING ({ml_predictions.get('customer_trend_pct',0):.1f}%)")
    if ml_predictions.get('expense_anomaly'):
        ml_notes.append(f"COST SPIKE: {ml_predictions.get('anomaly_detail','')}")
    if ml_predictions.get('days_until_stockout'):
        ml_notes.append(f"STOCK ALERT: ~{ml_predictions['days_until_stockout']} days until stockout")
    if ml_predictions.get('breakeven_progress_pct'):
        ml_notes.append(f"Break-even progress: {ml_predictions['breakeven_progress_pct']:.1f}% of monthly target")

    user_message = f"""
Entrepreneur: {user_name} | Business: {business_name} | Day {day_num}
Projected monthly profit target: K{projected_monthly_profit:.0f}

TODAY'S LOG:
Revenue: K{revenue:.0f} | Expenses: K{expenses:.0f} | Profit: K{profit:.0f}
Customers: {customers} (New: {log_data.get('new_customers',0)}, Repeat: {log_data.get('repeat_customers',0)})
Walk-ins: {log_data.get('walk_ins',0)} | Conversions: {log_data.get('conversions',0)}
Hours open: {log_data.get('hours_open',0)}
Stock status: {log_data.get('stock_status','sufficient')}
{f"Problem today: {log_data['daily_lesson']}" if log_data.get('daily_lesson') else ""}
{f"Win today: {log_data['daily_win']}" if log_data.get('daily_win') else ""}
{f"Customer note: {log_data['customer_note']}" if log_data.get('customer_note') else ""}

RECENT REVENUE (last 7 days): {', '.join(rev_history)}
Peak day: {ml_predictions.get('peak_day_of_week', 'Unknown')}

ML ALERTS:
{chr(10).join(ml_notes) if ml_notes else 'No alerts today.'}
"""

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=550,
            system=COACHING_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[Coaching] Error: {e}")
        return _placeholder_coaching(log_data, business_name)


def _placeholder_coaching(log_data: Dict, business_name: str) -> str:
    revenue = log_data.get('total_revenue', 0)
    expenses = log_data.get('total_expenses', 0)
    profit = revenue - expenses
    return (
        f"📊 **TODAY'S SNAPSHOT**\n"
        f"Revenue: K{revenue:.0f} | Expenses: K{expenses:.0f} | Profit: K{profit:.0f}\n\n"
        "⭐ **TOMORROW'S ONE PRIORITY**\n"
        "Keep logging consistently — KIP needs 7+ days of data to detect patterns and give you specific coaching.\n\n"
        "✅ **WELL DONE TODAY**\n"
        "You logged today. Discipline is the foundation of a profitable business."
    )


async def generate_weekly_review(
    logs: List[Dict],
    business_name: str,
    user_name: str,
    prev_week_logs: Optional[List[Dict]] = None
) -> Dict:
    """
    Generate a full weekly review: KPIs + ML patterns + KIP narrative.
    """
    if not logs:
        return {}

    # Calculate KPIs
    total_revenue  = sum(l.get('total_revenue', 0) for l in logs)
    total_expenses = sum(l.get('total_expenses', 0) for l in logs)
    net_profit     = total_revenue - total_expenses
    total_customers = sum(l.get('total_customers', 0) for l in logs)
    avg_customers  = total_customers / len(logs)
    revenues       = [l.get('total_revenue', 0) for l in logs]
    avg_sale       = sum(l.get('avg_sale_value', 0) for l in logs if l.get('avg_sale_value')) / max(len(logs), 1)

    # vs previous week
    revenue_change = None
    customer_change = None
    if prev_week_logs:
        prev_rev = sum(l.get('total_revenue', 0) for l in prev_week_logs)
        if prev_rev > 0:
            revenue_change = round(((total_revenue - prev_rev) / prev_rev) * 100, 1)
        prev_cust = sum(l.get('total_customers', 0) for l in prev_week_logs) / max(len(prev_week_logs), 1)
        if prev_cust > 0:
            customer_change = round(((avg_customers - prev_cust) / prev_cust) * 100, 1)

    # Best revenue day
    peak_day_of_week = _find_peak_day(logs)

    # Top expense category from breakdowns
    biggest_expense = _find_biggest_expense_category(logs)

    kpis = {
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "avg_daily_customers": round(avg_customers, 1),
        "avg_sale_value": round(avg_sale, 2),
        "revenue_change_pct": revenue_change,
        "customer_change_pct": customer_change,
        "peak_day": peak_day_of_week,
        "biggest_expense_category": biggest_expense,
        "logs_filed": len(logs),
        "trend_status": _assess_trend(total_revenue, total_expenses, prev_week_logs),
    }

    # KIP narrative (Claude API)
    narrative = await _generate_review_narrative(kpis, business_name, user_name)

    return {**kpis, "kip_narrative": narrative}


def _find_peak_day(logs: List[Dict]) -> str:
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_rev = [0.0] * 7
    day_cnt = [0] * 7
    for log in logs:
        ld = log.get('log_date')
        if isinstance(ld, str):
            try:
                ld = datetime.fromisoformat(ld.replace('Z', ''))
            except Exception:
                continue
        if ld and hasattr(ld, 'weekday'):
            d = ld.weekday()
            day_rev[d] += log.get('total_revenue', 0)
            day_cnt[d] += 1
    avgs = [day_rev[i] / day_cnt[i] if day_cnt[i] > 0 else 0 for i in range(7)]
    return day_names[avgs.index(max(avgs))] if max(avgs) > 0 else "Insufficient data"


def _find_biggest_expense_category(logs: List[Dict]) -> str:
    cat_totals = {}
    for log in logs:
        bd = log.get('expense_breakdown')
        if not bd:
            continue
        try:
            bd = json.loads(bd) if isinstance(bd, str) else bd
            for cat, amt in bd.items():
                cat_totals[cat] = cat_totals.get(cat, 0) + float(amt or 0)
        except Exception:
            pass
    if not cat_totals:
        return "General expenses"
    return max(cat_totals, key=cat_totals.get)


def _assess_trend(revenue: float, expenses: float, prev_logs: Optional[List]) -> str:
    if revenue <= 0:
        return "red"
    if expenses > revenue:
        return "red"
    if prev_logs:
        prev_rev = sum(l.get('total_revenue', 0) for l in prev_logs)
        if prev_rev > 0 and revenue > prev_rev * 1.05:
            return "green"
        if prev_rev > 0 and revenue < prev_rev * 0.9:
            return "yellow"
    profit_margin = (revenue - expenses) / revenue
    if profit_margin > 0.15:
        return "green"
    if profit_margin > 0:
        return "yellow"
    return "red"


async def _generate_review_narrative(kpis: Dict, business_name: str, user_name: str) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        rev = kpis.get('total_revenue', 0)
        profit = kpis.get('net_profit', 0)
        return (
            f"📅 **WEEK IN REVIEW**\n\n"
            f"This week {business_name} generated K{rev:.0f} in revenue with a net profit of K{profit:.0f}. "
            f"{'Revenue is trending positively.' if kpis.get('revenue_change_pct', 0) > 0 else 'Focus on growing revenue next week.'}"
        )

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=WEEKLY_REVIEW_PROMPT,
            messages=[{"role": "user", "content":
                f"Business: {business_name} | Owner: {user_name}\n"
                f"Weekly KPIs:\n{json.dumps(kpis, indent=2)}"
            }]
        )
        return response.content[0].text.strip()
    except Exception:
        return f"Weekly review for {business_name} — revenue K{kpis.get('total_revenue',0):.0f}, profit K{kips.get('net_profit',0):.0f}."
