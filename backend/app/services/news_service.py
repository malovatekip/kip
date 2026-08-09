"""
KIP News Service — Sprint 3
Handles: live rate fetching, news scraping, categorisation, KIP alert generation.
"""

import os, re, json, time, hashlib
import urllib.request, urllib.error, urllib.parse
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Tuple

# ── News sources ─────────────────────────────────────────────────
NEWS_SOURCES = [
    {
        "name": "Lusaka Times",
        "rss":  "https://www.lusakatimes.com/feed/",
        "categories": ["general_economy", "sme_business", "banking_finance"],
    },
    {
        "name": "Mwebantu",
        "rss":  "https://www.mwebantu.com/feed/",
        "categories": ["general_economy", "mining_copper", "taxation_fiscal"],
    },
    {
        "name": "Zambia Daily Mail",
        "rss":  "https://www.daily-mail.co.zm/feed/",
        "categories": ["general_economy", "agriculture", "sme_business"],
    },
    {
        "name": "Diggers News",
        "rss":  "https://diggers.news/feed/",
        "categories": ["general_economy", "banking_finance", "taxation_fiscal"],
    },
    {
        "name": "Times of Zambia",
        "rss":  "https://www.times.co.zm/feed/",
        "categories": ["general_economy", "sme_business"],
    },
]

# ── Category keyword mapping ─────────────────────────────────────
CATEGORY_KEYWORDS = {
    "exchange_rate":   ["kwacha", "zmw", "usd", "dollar", "exchange rate", "forex",
                        "bank of zambia", "boz", "currency", "depreciation", "appreciation"],
    "fuel_energy":     ["fuel", "petrol", "diesel", "zera", "energy", "electricity",
                        "zesco", "power", "load shedding", "kerosene"],
    "agriculture":     ["maize", "fra", "agriculture", "farming", "crop", "harvest",
                        "groundnut", "fertiliser", "food prices", "agro"],
    "mining_copper":   ["copper", "mine", "mopani", "first quantum", "kcm", "cobalt",
                        "konkola", "copperbelt", "metal", "kansanshi"],
    "taxation_fiscal": ["zra", "tax", "vat", "duty", "tariff", "budget", "revenue",
                        "levy", "customs", "fiscal", "pacra", "registration fee"],
    "banking_finance": ["bank", "loan", "interest rate", "ceec", "cdf", "microfinance",
                        "momo", "mobile money", "credit", "invest", "finance", "zanaco"],
    "sme_business":    ["sme", "small business", "entrepreneur", "startup", "ceec",
                        "cdf", "zda", "business", "industry", "commerce"],
    "infrastructure":  ["road", "bridge", "internet", "power", "water", "transport",
                        "infrastructure", "construction", "znbs", "zamtel"],
    "general_economy": ["economy", "gdp", "inflation", "employment", "poverty",
                        "growth", "imf", "world bank", "development"],
}

# Business types and the categories that affect them
BUSINESS_ALERT_MAP = {
    "transport":       ["fuel_energy", "infrastructure"],
    "delivery":        ["fuel_energy", "infrastructure"],
    "food":            ["agriculture", "fuel_energy", "general_economy"],
    "catering":        ["agriculture", "fuel_energy", "general_economy"],
    "restaurant":      ["agriculture", "fuel_energy", "general_economy"],
    "retail":          ["exchange_rate", "taxation_fiscal", "general_economy"],
    "shop":            ["exchange_rate", "taxation_fiscal", "general_economy"],
    "farm":            ["agriculture", "fuel_energy", "banking_finance"],
    "agriculture":     ["agriculture", "fuel_energy", "banking_finance"],
    "mining":          ["mining_copper", "fuel_energy", "infrastructure"],
    "repair":          ["exchange_rate", "general_economy"],
    "salon":           ["general_economy", "banking_finance"],
    "tailoring":       ["exchange_rate", "general_economy"],
    "construction":    ["fuel_energy", "infrastructure", "banking_finance"],
    "default":         ["sme_business", "banking_finance"],  # every user gets SME news
}


# ── Rate fetching ─────────────────────────────────────────────────

def _http_get(url: str, timeout: int = 10) -> Optional[str]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "KIP-ZambiaIntelligence/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[News] HTTP error {url}: {e}")
        return None


def fetch_usd_zmw() -> Optional[Dict]:
    """Fetch live USD/ZMW rate from ExchangeRate-API (free, no key needed)."""
    url = "https://open.er-api.com/v6/latest/USD"
    raw = _http_get(url)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        zmw = data.get("rates", {}).get("ZMW")
        if not zmw:
            return None
        return {"rate_type": "usd_zmw", "value": round(zmw, 4), "unit": "ZMW per USD"}
    except Exception:
        return None


def fetch_copper_price() -> Optional[Dict]:
    """Fetch copper price — uses a free public metals data source."""
    # Try metals-api free endpoint
    url = "https://www.lme.com/en/metals/non-ferrous/lme-copper"
    # Fallback: use a hardcoded reasonable estimate and note it's approximate
    # In production, replace with metals-api.com key or trading economics
    # For now we return None and the service will use cached value
    return None  # Will be replaced with real API when key is available


def fetch_fuel_prices() -> Optional[Dict]:
    """
    Fetch current Zambia fuel prices.
    ZERA publishes fuel prices on their website. We scrape the latest.
    """
    # url = "https://www.zera.org.zm/fuel-prices/"
    url = "https://www.zera.co.zw/"
    raw = _http_get(url, timeout=15)
    if not raw:
        return None

    # Extract price patterns like "K31.50" from ZERA page
    prices = re.findall(r'K\s*(\d+\.\d+)', raw)
    if len(prices) >= 2:
        try:
            petrol = float(prices[0])
            diesel = float(prices[1])
            return {"petrol": petrol, "diesel": diesel}
        except (ValueError, IndexError):
            pass
    return None


# ── Article images ─────────────────────────────────────────────────

# Junk that shows up in <img> tags but is never the story photo
_IMAGE_URL_BLOCKLIST = ("gravatar.", "emoji", "smilies", "spacer", "blank.", "1x1", "pixel", "avatar", "logo")


def _clean_image_url(url: str) -> Optional[str]:
    """Validate a candidate image URL; return it normalised or None."""
    if not url:
        return None
    url = url.strip().replace("&amp;", "&")
    if not url.lower().startswith(("http://", "https://")):
        return None
    lowered = url.lower()
    if any(junk in lowered for junk in _IMAGE_URL_BLOCKLIST):
        return None
    return url[:1000]


def _extract_item_image(item_xml: str) -> Optional[str]:
    """Pull an image out of a single RSS <item> block, if the feed carries one.

    WordPress feeds (all our Zambian sources) usually expose the featured
    image via media:content / media:thumbnail / enclosure, or as the first
    <img> inside the encoded content or description.
    """
    m = re.search(r'<media:(?:content|thumbnail)[^>]+url=["\']([^"\']+)["\']', item_xml, re.IGNORECASE)
    if m:
        img = _clean_image_url(m.group(1))
        if img:
            return img
    m = re.search(r'<enclosure[^>]+type=["\']image/[^"\']*["\'][^>]*url=["\']([^"\']+)["\']', item_xml, re.IGNORECASE) \
        or re.search(r'<enclosure[^>]+url=["\']([^"\']+)["\'][^>]*type=["\']image/', item_xml, re.IGNORECASE)
    if m:
        img = _clean_image_url(m.group(1))
        if img:
            return img
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', item_xml, re.IGNORECASE):
        img = _clean_image_url(m.group(1))
        if img:
            return img
    return None


def fetch_article_image(article_url: str) -> Optional[str]:
    """Fetch the article page and return its og:image (or twitter:image).

    Used as a fallback when the RSS item itself carried no image. One HTTP
    request per call — callers should only invoke this for articles that
    still lack an image, and throttle politely.

    Returns the image URL, "" if the page was fetched but has no usable
    image (callers can persist that and stop retrying), or None if the
    page couldn't be fetched at all (transient — worth retrying later).
    """
    html = _http_get(article_url, timeout=10)
    if not html:
        return None
    # Only the <head> matters and it avoids matching body content
    head = html[:60000]
    for pattern in (
        r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']',
    ):
        m = re.search(pattern, head, re.IGNORECASE)
        if m:
            img = _clean_image_url(m.group(1))
            if img:
                return img
    # Some sources (e.g. Zambia Daily Mail) publish no og:image at all.
    # All our sources are WordPress, where the story photo is served from
    # wp-content/uploads — take the first such <img> that isn't blocklisted.
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']*wp-content/uploads[^"\']+)["\']', html, re.IGNORECASE):
        img = _clean_image_url(m.group(1))
        if img:
            return img
    return ""


# ── RSS Parsing ────────────────────────────────────────────────────

def _parse_rss(xml: str, source_name: str) -> List[Dict]:
    """Parse RSS XML and extract articles."""
    articles = []

    # Simple regex-based RSS parser (no external dependencies)
    items = re.findall(r'<item>(.*?)</item>', xml, re.DOTALL)

    for item in items[:15]:  # max 15 per source per fetch
        def extract(tag):
            m = re.search(rf'<{tag}[^>]*><!\[CDATA\[(.*?)\]\]></{tag}>', item, re.DOTALL)
            if m: return m.group(1).strip()
            m = re.search(rf'<{tag}[^>]*>(.*?)</{tag}>', item, re.DOTALL)
            return m.group(1).strip() if m else ""

        headline = extract("title")
        summary  = extract("description")
        url      = extract("link") or extract("guid")
        pub_date = extract("pubDate")

        # Clean HTML from summary
        summary = re.sub(r'<[^>]+>', '', summary)[:500].strip()

        if not headline or not url:
            continue

        # Parse date
        published_at = None
        if pub_date:
            for fmt in ["%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S +0000"]:
                try:
                    published_at = datetime.strptime(pub_date.strip(), fmt)
                    break
                except ValueError:
                    pass

        # Skip if older than 7 days
        if published_at:
            age = datetime.now(timezone.utc) - published_at.astimezone(timezone.utc)
            if age > timedelta(days=7):
                continue

        articles.append({
            "headline":     headline,
            "summary":      summary,
            "url":          url.strip(),
            "image_url":    _extract_item_image(item),
            "source_name":  source_name,
            "published_at": published_at,
            "raw_text":     f"{headline} {summary}".lower(),
        })

    return articles


def categorise_article(raw_text: str) -> str:
    """Assign the best-matching category to an article."""
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in raw_text)
        if score > 0:
            scores[cat] = score

    if not scores:
        return "general_economy"
    return max(scores, key=scores.get)


def scrape_news() -> List[Dict]:
    """Scrape all news sources and return list of article dicts."""
    all_articles = []
    for source in NEWS_SOURCES:
        print(f"  [News] Scraping {source['name']}...")
        raw = _http_get(source["rss"], timeout=20)
        if not raw:
            print(f"  [News] Could not reach {source['name']}")
            continue
        articles = _parse_rss(raw, source["name"])
        for a in articles:
            a["category"] = categorise_article(a["raw_text"])
        all_articles.extend(articles)
        time.sleep(0.5)  # polite delay between sources

    print(f"  [News] Scraped {len(all_articles)} articles total")
    return all_articles


# ── Alert generation ────────────────────────────────────────────────

def _get_alert_categories_for_business(idea_name: str) -> List[str]:
    """Return relevant news categories for a business type."""
    idea_lower = idea_name.lower()
    matched = set(BUSINESS_ALERT_MAP["default"])
    for biz_type, categories in BUSINESS_ALERT_MAP.items():
        if biz_type != "default" and biz_type in idea_lower:
            matched.update(categories)
    return list(matched)


def _compose_alert_message(article: Dict, idea_name: str) -> str:
    """Ask KIP to write a personalised alert message for this news + business combo."""
    category = article.get("category", "general_economy")
    headline = article.get("headline", "")

    templates = {
        "fuel_energy":     f"Fuel prices have changed. This directly affects your {idea_name}'s transport and operational costs. Review your pricing to maintain your profit margin.",
        "exchange_rate":   f"The ZMW/USD rate has moved. If your {idea_name} relies on any imported goods or materials, your input costs may have changed.",
        "agriculture":     f"Agricultural prices are shifting. If your {idea_name} uses food inputs or serves agricultural customers, this may affect your business.",
        "mining_copper":   f"Copper market news may affect economic activity in the Copperbelt. If your {idea_name} serves mining-adjacent customers, take note.",
        "taxation_fiscal": f"There are tax or regulatory updates that may affect your {idea_name}. Review to ensure you remain compliant.",
        "banking_finance": f"New financing or banking news is available that may create an opportunity for your {idea_name}.",
        "sme_business":    f"There is a new programme or announcement relevant to small businesses like your {idea_name}.",
        "infrastructure":  f"Infrastructure changes in your area may affect access to your {idea_name} or your supply chain.",
        "general_economy": f"Economic conditions are shifting. Stay informed so your {idea_name} can adapt its strategy.",
    }

    return templates.get(category, templates["general_economy"])


def generate_alerts_for_user(user_ideas: List[Dict], new_articles: List[Dict]) -> List[Dict]:
    """
    Given a user's business ideas and new articles,
    return a list of alert dicts for relevant matches.
    """
    alerts = []

    for article in new_articles:
        article_category = article.get("category", "")

        for idea in user_ideas:
            idea_name = idea.get("idea_name", "your business")
            relevant_cats = _get_alert_categories_for_business(idea_name)

            if article_category in relevant_cats:
                alerts.append({
                    "headline":     article["headline"],
                    "kip_message":  _compose_alert_message(article, idea_name),
                    "business_name": idea_name,
                    "category":     article_category,
                    "article_url":  article.get("url", ""),
                })

    # Deduplicate — one alert per article per user max
    seen = set()
    unique = []
    for a in alerts:
        key = hashlib.md5(f"{a['headline']}{a['business_name']}".encode()).hexdigest()
        if key not in seen:
            seen.add(key)
            unique.append(a)

    return unique
