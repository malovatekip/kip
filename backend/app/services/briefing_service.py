"""
briefing_service.py
────────────────────
KIP Economic Briefing Service

Runs once daily (or on-demand via refresh endpoint).
1. Uses Claude with web_search to find 6–8 top trending Zambian economic
   stories from priority sources (BoZ, State House, Ministries, ERB, etc.)
2. Claude verifies each story is genuinely pressing/important for Zambians
3. Claude simplifies each story into plain-English explanation + impact analysis
4. Stores results in the `briefings` DB table with image search terms
5. Frontend fetches cached results from /news/briefings endpoint

Priority sources:
  Bank of Zambia (boz.zm)
  State House (president.gov.zm / statehouse.gov.zm)
  Ministry of Finance (mof.gov.zm)
  Ministry of Mines (mines.gov.zm)
  Ministry of Agriculture (moa.gov.zm)
  SMED (smed.org.zm)
  Ministry of Commerce (mcti.gov.zm)
  Zamstats (zamstats.gov.zm)
  Energy Regulation Board (erb.org.zm)
  Lusaka Times, Mwebantu, Times of Zambia (as aggregators)
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import anthropic
import httpx
from sqlalchemy.orm import Session

from app.database import get_db   # adjust to your actual import
from app.models.models_briefing import EconomicBriefing   # model defined below

log = logging.getLogger(__name__)

# ── Anthropic client ──────────────────────────────────────────────────────────
_client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from environment

# ── Priority sources for Claude to search ────────────────────────────────────
PRIORITY_SOURCES = [
    "site:boz.zm",
    "site:president.gov.zm OR site:statehouse.gov.zm",
    "site:mof.gov.zm",
    "site:mines.gov.zm",
    "site:moa.gov.zm",
    "site:smed.org.zm",
    "site:mcti.gov.zm",
    "site:zamstats.gov.zm",
    "site:erb.org.zm",
    "site:lusakatimes.com OR site:mwebantu.com OR site:times.co.zm",
]

# ── System prompt for the briefing generator ─────────────────────────────────
BRIEFING_SYSTEM_PROMPT = """You are KIP's Economic Briefing Editor for Zambia.

Your job is to find the most important, pressing economic and financial news
affecting ordinary Zambians today, then explain each story in plain language
that a market trader, small business owner, or everyday citizen can understand.

SOURCES TO PRIORITISE (search these specifically):
- Bank of Zambia (boz.zm) — monetary policy, exchange rates, foreign reserves, inflation
- State House / President's Office — economic policy announcements
- Ministry of Finance (mof.gov.zm) — budget, debt, fiscal policy, IMF updates
- Ministry of Mines (mines.gov.zm) — copper, cobalt, mining royalties, Kansanshi, Mopani
- Ministry of Agriculture (moa.gov.zm) — crop forecasts, food security, FISP, grain prices
- SMED Commission (smed.org.zm) — SME policies, loans, business support
- Ministry of Commerce and Trade (mcti.gov.zm) — trade policy, import/export, business licences
- Zambia Statistics Agency (zamstats.gov.zm) — CPI inflation, GDP, employment
- Energy Regulation Board (erb.org.zm) — fuel prices, electricity tariffs
- Lusaka Times, Mwebantu, Times of Zambia — Zambian news aggregators

WHAT COUNTS AS IMPORTANT:
- Interest rate changes (affects loans and savings)
- Exchange rate movements (affects prices of imported goods)
- Foreign reserves levels (signal economic stability/instability)
- Fuel price adjustments (affects transport and food prices)
- Inflation data releases (affects purchasing power)
- Budget announcements or supplementary budgets
- Mining sector news (Zambia's largest export earner)
- IMF/World Bank programme updates (affects government spending)
- Food security alerts or crop forecasts
- New SME financing programmes or changes to business regulations
- Presidential economic policy announcements

WHAT TO IGNORE:
- Political news without economic impact
- Sports, entertainment, crime stories
- Purely local/council-level stories with no national economic significance
- Duplicate stories about the same event

TONE AND LANGUAGE:
- Write as if explaining to a Zambian market trader or tuck shop owner
- Use simple English, short sentences, and everyday examples
- Compare abstract numbers to things people understand
  (e.g. "K1 billion is like paying the salary of every nurse in Zambia for 3 years")
- Always end with a clear "What this means for YOUR business/wallet" section
- Avoid jargon — if you must use a technical term, immediately define it
- Be honest about uncertainty — don't overpromise or scaremonger

OUTPUT FORMAT:
You MUST return a valid JSON array. Each item must have exactly these fields:
{
  "title": "Short headline in plain English (max 12 words)",
  "source": "Name of the original source (e.g. Bank of Zambia)",
  "source_url": "URL to original announcement if found",
  "category": one of: "monetary_policy" | "exchange_rate" | "inflation" | "fuel_energy" | "mining" | "agriculture" | "sme_business" | "trade_commerce" | "fiscal_policy" | "food_security",
  "importance": "HIGH" | "MEDIUM",
  "emoji": "Single relevant emoji",
  "headline_plain": "One-sentence plain-English summary of what happened",
  "explanation": "3-4 paragraph explanation in simple language. Use \\n\\n between paragraphs.",
  "impact_ordinary": "2-3 sentences on how this directly affects ordinary Zambians — prices, jobs, savings, loans",
  "impact_business": "2-3 sentences specifically for small business owners",
  "kip_take": "1-2 sentences of KIP's practical advice for what small business owners should do in response",
  "image_search_term": "3-5 word image search term for Unsplash (e.g. 'Zambia currency kwacha' or 'fuel station Africa' or 'copper mine Zambia')",
  "date_published": "Approximate date of the original news in YYYY-MM-DD format, or today's date if unknown"
}

Return ONLY the JSON array, no markdown, no preamble, no explanation outside the JSON.
If you find fewer than 4 genuinely important stories, it is better to return 4 high-quality
items than 8 mediocre ones.
"""

# ── Main briefing generation function ────────────────────────────────────────

def generate_briefings() -> list[dict]:
    """
    Call Claude with web_search to find + simplify top Zambian economic news.
    Returns a list of briefing dicts ready to store in the DB.
    """
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    user_prompt = f"""Today is {today}.

Search for the most important and trending economic, financial, and business
news in Zambia right now. Focus on the priority sources listed in your instructions.

Search for:
1. Latest Bank of Zambia announcements (monetary policy, foreign reserves, exchange rate)
2. Latest Zambia Statistics Agency data (inflation/CPI, GDP)
3. Energy Regulation Board fuel price updates
4. Ministry of Finance announcements (budget, debt, IMF)
5. Mining sector developments (copper prices, major mines news)
6. Ministry of Agriculture updates (food security, crop forecasts, FISP)
7. Presidential economic announcements
8. Any other pressing economic story affecting ordinary Zambians

After searching, select the 6-8 most important stories and return them as a
JSON array following the exact format in your instructions.

Be thorough with your searches — check multiple sources and verify the stories
are recent (within the last 2 weeks ideally, or the most recent available).
"""

    log.info("[KIP Briefing] Starting daily briefing generation...")

    try:
        response = _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            system=BRIEFING_SYSTEM_PROMPT,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": user_prompt}],
        )

        # Extract text blocks from response (tool_use blocks are intermediate)
        full_text = ""
        for block in response.content:
            if hasattr(block, "type") and block.type == "text":
                full_text += block.text

        if not full_text.strip():
            log.error("[KIP Briefing] No text content returned from Claude")
            return []

        # Parse JSON — strip any accidental markdown fences
        clean = re.sub(r"```(?:json)?", "", full_text).strip().strip("`").strip()

        # Find the JSON array in the response
        array_match = re.search(r'\[.*\]', clean, re.DOTALL)
        if not array_match:
            log.error("[KIP Briefing] Could not find JSON array in response: %s", clean[:500])
            return []

        briefings = json.loads(array_match.group(0))
        log.info("[KIP Briefing] Generated %d briefings", len(briefings))
        return briefings

    except json.JSONDecodeError as e:
        log.error("[KIP Briefing] JSON parse error: %s", e)
        return []
    except anthropic.APIError as e:
        log.error("[KIP Briefing] Anthropic API error: %s", e)
        return []
    except Exception as e:
        log.error("[KIP Briefing] Unexpected error: %s", e)
        return []


def store_briefings(briefings: list[dict], db: Session) -> int:
    """
    Store generated briefings in the database.
    Clears today's existing briefings before inserting fresh ones
    (so a refresh replaces rather than duplicates).
    Returns count of stored items.
    """
    if not briefings:
        return 0

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Delete today's existing briefings (allow refresh to replace)
    db.query(EconomicBriefing)\
      .filter(EconomicBriefing.generated_date == today_str)\
      .delete()
    db.commit()

    stored = 0
    for item in briefings:
        try:
            briefing = EconomicBriefing(
                title            = item.get("title", "")[:200],
                source           = item.get("source", "")[:200],
                source_url       = item.get("source_url", "")[:500],
                category         = item.get("category", "fiscal_policy")[:50],
                importance       = item.get("importance", "MEDIUM")[:10],
                emoji            = item.get("emoji", "📊")[:10],
                headline_plain   = item.get("headline_plain", "")[:500],
                explanation      = item.get("explanation", ""),
                impact_ordinary  = item.get("impact_ordinary", ""),
                impact_business  = item.get("impact_business", ""),
                kip_take         = item.get("kip_take", ""),
                image_search_term= item.get("image_search_term", "Zambia economy")[:100],
                date_published   = item.get("date_published", today_str)[:20],
                generated_date   = today_str,
                generated_at     = datetime.now(timezone.utc),
            )
            db.add(briefing)
            stored += 1
        except Exception as e:
            log.error("[KIP Briefing] Error storing briefing item: %s", e)
            continue

    db.commit()
    log.info("[KIP Briefing] Stored %d briefings for %s", stored, today_str)
    return stored


def run_daily_briefing(db: Session) -> dict:
    """
    Full pipeline: generate + store.
    Called by the scheduler and the /refresh endpoint.
    """
    briefings = generate_briefings()
    count = store_briefings(briefings, db)
    return {"status": "ok", "count": count, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
