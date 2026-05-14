"""
KIP Business Dashboard Service — Sprint 4
Handles: Launch Plan generation, Daily Coaching, Profitability Detection.
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Tuple
import anthropic

# ── Launch Plan System Prompt ─────────────────────────────────────

LAUNCH_PLAN_PROMPT = """
You are KIP — the Kwacha Intelligence Platform — acting as a Zambian business launch consultant.

Your task is to generate a detailed, week-by-week business launch plan for a Zambian entrepreneur.
The plan must be:
- Specific to this exact business type and location
- Calibrated to the stated capital — never suggest spending more than available
- Grounded in Zambian reality (PACRA registration, ZRA, local suppliers, MTN MoMo/Airtel Money)
- Broken into clear phases with weekly milestones
- Actionable — every item must be something the person can actually do

OUTPUT FORMAT — respond ONLY with valid JSON matching this structure exactly:
{
  "business_name": "string",
  "location": "string",
  "projected_monthly_profit": number,
  "projected_break_even_days": number,
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "string (e.g. Pre-Launch)",
      "duration_weeks": number,
      "description": "string",
      "weeks": [
        {
          "week_number": 1,
          "title": "string",
          "milestones": [
            {
              "day_range": "Day 1-2",
              "task": "string — specific actionable task",
              "cost_zmw": number or 0,
              "notes": "string — practical tip or Zambian-specific detail"
            }
          ]
        }
      ]
    }
  ],
  "first_week_checklist": ["item1", "item2", "item3", "item4", "item5"],
  "success_metrics": {
    "week_4_revenue_target": number,
    "month_2_profit_target": number,
    "break_even_indicator": "string describing what break-even looks like"
  }
}

Phases should be:
1. Pre-Launch (registration, setup, sourcing) — Weeks 1-2
2. Soft Launch (first customers, testing) — Weeks 3-4
3. Growth (optimize, scale, daily coaching begins) — Month 2+

Be specific about Zambian steps:
- PACRA online registration: pacra.org.zm, cost ~K120-K150 for business name
- ZRA: register for Turnover Tax if expecting over K50,000/year
- Banking: ZANACO or FNB SME account recommended
- Mobile money: MTN MoMo and Airtel Money are essential for Zambian customers
- Name actual markets for sourcing stock (Chisokone for Copperbelt, Soweto for Lusaka)
"""

COACHING_PROMPT = """
You are KIP — the Kwacha Intelligence Platform — acting as a daily business performance coach.

You are reviewing a Zambian entrepreneur's daily business log and providing personalised coaching.
Your coaching must be:
- Data-driven: every observation must reference actual numbers from the logs
- Specific: one clear pattern, one clear action
- Encouraging but honest: celebrate wins, address problems directly
- Zambian-contextualised: understand local market rhythms, payment patterns, cultural factors

OUTPUT FORMAT — respond with structured coaching in this EXACT format:

📊 PERFORMANCE SUMMARY
Revenue today: K[X] | This week: K[X] | Target pace: K[X]/week
Expenses today: K[X] | Net today: K[X]
Customers today: [X] | Average transaction: K[X]
Status: [On Track / Behind Target / Exceeding Target]

🔍 PATTERN KIP NOTICED
[One specific, data-backed observation. Reference actual day/date and numbers.
Connect it to a Zambian market reality if possible.]

⭐ TODAY'S ONE PRIORITY
[One specific, achievable action for tomorrow. Must be directly connected to the pattern above.
Make it concrete — what to do, when, and how.]

[Include STOCK ALERT section ONLY if stock is low or the usage pattern predicts stockout within 5 days:
📦 STOCK ALERT
[Specific item likely running low, based on log patterns. When to restock.]]

[Include PROBLEM RESPONSE section ONLY if a problem was logged:
🔧 ON YOUR PROBLEM TODAY
[Direct, practical response to the specific problem logged. Zambian solutions.]]

✅ KEEP DOING THIS
[One thing the entrepreneur is doing well, with specific numbers as evidence.]

[Include PROFIT MILESTONE section ONLY if profit target has been reached for 14+ consecutive days:
🎯 PROFIT MILESTONE REACHED
[Congratulations message. What this means. Next level advice.]]

RULES:
- Never give generic advice — if you cannot reference actual numbers, say you need more log days
- Keep total response under 350 words — this is read on a phone after a long day
- Write warmly but professionally — this person is working hard
"""


async def generate_launch_plan(
    idea_full_response: str,
    idea_name: str,
    location: str,
    capital_amount: Optional[float],
    user_full_name: str
) -> Dict:
    """
    Call Claude API to generate a structured launch plan.
    Returns the plan as a parsed dict.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        return _placeholder_plan(idea_name, location, capital_amount)

    client = anthropic.Anthropic(api_key=api_key)

    user_message = f"""
Generate a complete business launch plan for:

ENTREPRENEUR: {user_full_name}
BUSINESS IDEA: {idea_name}
LOCATION: {location or 'Zambia'}
AVAILABLE CAPITAL: K{capital_amount:,.0f} ZMW

ORIGINAL KIP RECOMMENDATION:
{idea_full_response[:1500]}

Generate the full JSON launch plan now.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            system=LAUNCH_PLAN_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        plan = json.loads(raw)
        return plan

    except json.JSONDecodeError:
        return _placeholder_plan(idea_name, location, capital_amount)
    except Exception as e:
        print(f"[Dashboard] Launch plan generation error: {e}")
        return _placeholder_plan(idea_name, location, capital_amount)


def _placeholder_plan(idea_name: str, location: str, capital: Optional[float]) -> Dict:
    """Fallback plan when API is unavailable."""
    cap = capital or 3000
    return {
        "business_name": idea_name,
        "location": location or "Zambia",
        "projected_monthly_profit": round(cap * 0.25),
        "projected_break_even_days": 45,
        "phases": [
            {
                "phase_number": 1,
                "phase_name": "Pre-Launch",
                "duration_weeks": 2,
                "description": "Legal registration, setup, and sourcing phase.",
                "weeks": [
                    {
                        "week_number": 1,
                        "title": "Legal & Registration",
                        "milestones": [
                            {"day_range": "Day 1-2", "task": "Register business name at PACRA (pacra.org.zm)", "cost_zmw": 130, "notes": "Do this online — takes 1-3 business days"},
                            {"day_range": "Day 3-4", "task": "Open business bank account (ZANACO recommended)", "cost_zmw": 0, "notes": "Bring NRC and PACRA certificate"},
                            {"day_range": "Day 5-7", "task": "Secure premises and sign rental agreement", "cost_zmw": round(cap * 0.15), "notes": "Negotiate 1 month free if possible"},
                        ]
                    },
                    {
                        "week_number": 2,
                        "title": "Setup & Sourcing",
                        "milestones": [
                            {"day_range": "Day 8-10", "task": "Purchase equipment and setup workspace", "cost_zmw": round(cap * 0.3), "notes": "Buy quality tools — cheap tools cost more long-term"},
                            {"day_range": "Day 11-12", "task": "Source initial stock from local wholesale market", "cost_zmw": round(cap * 0.2), "notes": "Build relationship with supplier from day one"},
                            {"day_range": "Day 13-14", "task": "Install signage and set up MTN MoMo / Airtel Money", "cost_zmw": round(cap * 0.05), "notes": "Mobile money is essential — many customers prefer it"},
                        ]
                    }
                ]
            },
            {
                "phase_number": 2,
                "phase_name": "Soft Launch",
                "duration_weeks": 2,
                "description": "First customers, testing your pricing, and building word-of-mouth.",
                "weeks": [
                    {
                        "week_number": 3,
                        "title": "First Customers",
                        "milestones": [
                            {"day_range": "Day 15-17", "task": "Offer 20% launch discount to first 10 customers", "cost_zmw": 0, "notes": "Tell them to spread the word — this is marketing"},
                            {"day_range": "Day 18-19", "task": "Join local neighbourhood Facebook group and post your opening", "cost_zmw": 0, "notes": "Include photos of your setup"},
                            {"day_range": "Day 20-21", "task": "Approach 3 nearby businesses for referral partnership", "cost_zmw": 0, "notes": "Offer 10% commission for every referral that pays"},
                        ]
                    },
                    {
                        "week_number": 4,
                        "title": "Optimize Operations",
                        "milestones": [
                            {"day_range": "Day 22-24", "task": "Review pricing — are you profitable on each transaction?", "cost_zmw": 0, "notes": "Use your actual receipts, not estimates"},
                            {"day_range": "Day 25-26", "task": "Establish regular supplier restocking schedule", "cost_zmw": 0, "notes": "Never let stock run out — this kills momentum"},
                            {"day_range": "Day 27-28", "task": "Start your KIP daily log — track every transaction", "cost_zmw": 0, "notes": "2 minutes every evening. KIP needs this data to coach you."},
                        ]
                    }
                ]
            }
        ],
        "first_week_checklist": [
            "Register business name at PACRA (pacra.org.zm)",
            "Open business bank account",
            "Secure and set up premises",
            "Source initial stock",
            "Set up MTN MoMo and Airtel Money"
        ],
        "success_metrics": {
            "week_4_revenue_target": round(cap * 0.6),
            "month_2_profit_target": round(cap * 0.25),
            "break_even_indicator": f"When daily revenue consistently exceeds K{round(cap * 0.012):,}"
        }
    }


async def generate_daily_coaching(
    plan: Dict,
    logs: List[Dict],
    business_name: str,
    user_name: str
) -> str:
    """
    Generate a personalised daily coaching message based on recent log data.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    if not logs:
        return (
            f"Welcome to your KIP Business Dashboard, {user_name.split()[0]}! "
            f"Submit your first daily log for {business_name} and KIP will start coaching you immediately. "
            "It only takes 2 minutes."
        )

    if not api_key or api_key == "your-anthropic-api-key-here":
        return _placeholder_coaching(logs, business_name)

    # Build log summary for the prompt
    log_summary = _format_logs_for_prompt(logs)
    projected_profit = plan.get("projected_monthly_profit", 0)
    day_number = len(logs)

    client = anthropic.Anthropic(api_key=api_key)

    user_message = f"""
Business: {business_name}
Day: {day_number} of operations
Entrepreneur: {user_name}
Projected monthly profit: K{projected_profit:,.0f}

LOG DATA (most recent first):
{log_summary}

Generate daily coaching now.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=COACHING_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[Dashboard] Coaching error: {e}")
        return _placeholder_coaching(logs, business_name)


def _format_logs_for_prompt(logs: List[Dict]) -> str:
    """Format log records into a concise string for the coaching prompt."""
    lines = []
    for i, log in enumerate(logs[-14:]):  # last 14 days
        date_str = log.get("log_date", "")[:10] if log.get("log_date") else f"Day {i+1}"
        lines.append(
            f"{date_str}: Revenue K{log.get('revenue_today',0):.0f} | "
            f"Expenses K{log.get('expenses_today',0):.0f} | "
            f"Customers {log.get('customer_count',0)} | "
            f"Stock: {log.get('stock_status','sufficient')}"
            + (f" | Problem: {log['problem_today']}" if log.get('problem_today') else "")
            + (f" | Win: {log['highlight_today']}" if log.get('highlight_today') else "")
        )
    return "\n".join(lines)


def _placeholder_coaching(logs: List[Dict], business_name: str) -> str:
    """Fallback coaching when API is unavailable."""
    if not logs:
        return f"Submit your first log for {business_name} to receive KIP coaching."

    latest = logs[-1]
    revenue = latest.get("revenue_today", 0)
    expenses = latest.get("expenses_today", 0)
    net = revenue - expenses

    return (
        f"📊 PERFORMANCE SUMMARY\n"
        f"Revenue today: K{revenue:.0f} | Expenses: K{expenses:.0f} | Net: K{net:.0f}\n\n"
        f"⭐ TODAY'S ONE PRIORITY\n"
        f"Keep logging daily — KIP needs at least 7 days of data to identify patterns "
        f"and give you specific coaching. You are building the data foundation.\n\n"
        f"✅ KEEP DOING THIS\n"
        f"You logged today. Consistency is the foundation of everything. Keep it up."
    )


def check_profitability(plan_dict: Dict, logs: List[Dict]) -> Tuple[bool, str]:
    """
    Check if the business has reached its profitability target.
    Returns (is_profitable, message).
    """
    if len(logs) < 30:
        return False, ""

    projected_monthly = plan_dict.get("projected_monthly_profit", 0)
    if not projected_monthly:
        return False, ""

    # Check last 14 days
    recent = logs[-14:]
    target_14d = projected_monthly * (14 / 30)
    actual_14d = sum(
        l.get("revenue_today", 0) - l.get("expenses_today", 0)
        for l in recent
    )

    # Check the 14 days before that
    if len(logs) >= 28:
        prev = logs[-28:-14]
        prev_14d = sum(
            l.get("revenue_today", 0) - l.get("expenses_today", 0)
            for l in prev
        )
        both_periods_profitable = (actual_14d >= target_14d) and (prev_14d >= target_14d)
    else:
        both_periods_profitable = actual_14d >= target_14d * 1.2  # higher bar if only one period

    if both_periods_profitable:
        msg = (
            f"🎯 CONGRATULATIONS — YOUR BUSINESS IS PROFITABLE!\n\n"
            f"Over the past 28 days, your business has consistently met or exceeded "
            f"the K{projected_monthly:,.0f}/month profit target KIP projected.\n\n"
            f"You have officially graduated from active daily coaching. "
            f"KIP will now check in weekly rather than daily.\n\n"
            f"What this means:\n"
            f"• Your business model is working\n"
            f"• Your operations are stable\n"
            f"• You are ready to think about growth\n\n"
            f"Keep logging — your data is now an asset. "
            f"Ask KIP about scaling, hiring, or opening a second location."
        )
        return True, msg

    return False, ""
