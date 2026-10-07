"""
Kip -- the in-simulation AI advisor (mid-game intervention).

Given one trading week's trace plus a little running context, Kip reads the
numbers and returns EXACTLY two things: the single most important PROBLEM that
week and ONE concrete SOLUTION to try next week. The whole message is capped at
50 words so it fits the advisor's speech bubble and reads cleanly out loud.

Pure helper: callers pass plain dicts, so there is no DB/HTTP coupling. If the
Claude API key is missing or the call fails, we fall back to the engine's
rule-based tips so a week is never left without guidance.
"""
import json
import os

import anthropic

MODEL = "claude-sonnet-5"
MAX_WORDS = 50

SYSTEM = (
    "You are Kip, a sharp, warm business advisor for a Zambian entrepreneur "
    "playing a week-by-week business simulation. You are shown ONE trading "
    "week's numbers. Reply in plain, simple English a first-time shop owner "
    "understands. Say EXACTLY two things and nothing else: the single most "
    "important PROBLEM you see this week, and ONE concrete SOLUTION to try next "
    "week. No greeting, no preamble, no lists, no markdown. The problem and the "
    f"solution TOGETHER must stay under {MAX_WORDS} words. "
    'Respond ONLY as compact JSON: {"problem": "...", "solution": "..."}'
)


def generate_advice(week: dict, *, idea_name: str, category: str,
                    running_viability: float, baseline_viability: float) -> dict:
    """Return {"problem": str, "solution": str} for this week."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your-anthropic-api-key-here":
        return _fallback(week)
    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM,
            messages=[{"role": "user", "content": _week_brief(
                week, idea_name, category, running_viability, baseline_viability)}],
        )
        from app.services import usage_meter
        usage_meter.record_usage("sim_advice", MODEL, msg)
        data = json.loads(_extract_json(msg))
        problem = str(data.get("problem") or "").strip()
        solution = str(data.get("solution") or "").strip()
        if not problem and not solution:
            return _fallback(week)
        return _capped(problem, solution)
    except Exception:
        # Any API/parse/transport failure must never break the week.
        return _fallback(week)


def _week_brief(week: dict, idea_name: str, category: str,
                running_v: float, baseline_v: float) -> str:
    num = lambda k: float(week.get(k) or 0)
    turned_away = max(0.0, num("gross_demand") - num("served_demand"))
    lines = [
        f"Business: {idea_name} ({(category or '').replace('_', ' ') or 'general'}).",
        f"Trading week {int(num('week'))}.",
        f"Customers who wanted to buy: {num('gross_demand'):.0f}; "
        f"actually served: {num('served_demand'):.0f}; turned away: {turned_away:.0f}.",
        f"Staff: {int(num('staff_count'))} (can serve about {num('staff_capacity'):.0f} "
        f"customers); labour strain index {num('labor_strain_index'):.2f} "
        "(above 1.25 means the team is overworked).",
        f"Revenue: {num('revenue'):.0f} ZMW; net profit: {num('net_profit'):.0f} ZMW; "
        f"cash in hand: {num('cash_balance'):.0f} ZMW; "
        f"cash crunch: {'YES' if week.get('in_crunch') else 'no'}.",
        f"Unsold stock left on the shelf: {num('unsold'):.0f} units.",
    ]
    if week.get("shock_hit"):
        lines.append(
            f"A shock hit this week: {week.get('shock_name')} -- "
            f"{num('units_lost'):.0f} units of stock were lost.")
    elif week.get("shock_name"):
        lines.append(f"A threat named {week.get('shock_name')} loomed but did not hit.")
    lines.append(
        f"Business health score is now {running_v:.2f} out of 10 "
        f"(it started at {baseline_v:.2f}).")
    return "\n".join(lines)


def _capped(problem: str, solution: str) -> dict:
    """Safety net: keep problem + solution together under MAX_WORDS."""
    if len((problem + " " + solution).split()) <= MAX_WORDS:
        return {"problem": problem, "solution": solution}
    p_words = problem.split()
    if len(p_words) > MAX_WORDS:  # pathological: problem alone is too long
        return {"problem": " ".join(p_words[:MAX_WORDS]).rstrip(".,") + ".", "solution": ""}
    budget = MAX_WORDS - len(p_words)
    s_words = solution.split()[:budget]
    return {"problem": problem, "solution": " ".join(s_words).rstrip(".,") + ("." if s_words else "")}


def _fallback(week: dict) -> dict:
    """Reuse the engine's rule-based tips when the AI path is unavailable."""
    tips = [t.get("text", "") for t in (week.get("advice") or []) if t.get("text")]
    problem = tips[0] if tips else "A steady week with nothing urgent to fix."
    solution = tips[1] if len(tips) > 1 else "Keep your current plan and watch next week's demand."
    return {"problem": problem, "solution": solution}


def _extract_json(message) -> str:
    """Pull the JSON object out of a Messages response, tolerant of stray prose."""
    text = ""
    for block in getattr(message, "content", []) or []:
        if getattr(block, "type", None) == "text":
            text += block.text
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text
