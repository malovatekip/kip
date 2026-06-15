"""
KIP Capital Access Finder — Sprint 17
Matches a user's business profile to available Zambian funding sources.
Returns eligibility assessment + AI-generated guidance per source.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Optional, List

from app.database import get_db
from app.security import get_current_user
from app.models.user import User

router = APIRouter()

# ── Zambian funding sources database ─────────────────────────────────────────

FUNDING_SOURCES = [
    {
        "id":           "cdf",
        "name":         "Constituency Development Fund (CDF)",
        "type":         "grant",
        "provider":     "Government of Zambia",
        "color":        "#1AE06E",
        "min_amount":   5_000,
        "max_amount":   100_000,
        "currency":     "ZMW",
        "interest_rate":None,
        "repayment":    "Grant — no repayment required",
        "eligibility": [
            "Zambian citizen",
            "Business located in the MP's constituency",
            "Business registered or willing to register",
            "Viable business plan required",
        ],
        "requirements": [
            "NRC copy",
            "Business plan or proposal",
            "Proof of residence in constituency",
            "Bank account details",
        ],
        "website":      "https://cdf.gov.zm",
        "contact":      "Your local MP's office or Ward Development Committee",
        "processing":   "4–12 weeks",
        "notes":        "CDF is disbursed through constituency offices. Availability varies by MP and constituency. Best approached with a clear, simple business proposal.",
        "best_for":     ["retail", "agriculture", "food", "services", "manufacturing"],
        "min_capital":  0,
    },
    {
        "id":           "ceec",
        "name":         "Citizens Economic Empowerment Commission (CEEC)",
        "type":         "loan",
        "provider":     "CEEC",
        "color":        "#2B7FFF",
        "min_amount":   10_000,
        "max_amount":   500_000,
        "currency":     "ZMW",
        "interest_rate":"5% per annum",
        "repayment":    "12–60 months",
        "eligibility": [
            "Zambian citizen (51% ownership)",
            "Business registered with PACRA",
            "Viable and bankable business plan",
            "No existing CEEC default",
            "Collateral or guarantor may be required above K50,000",
        ],
        "requirements": [
            "Completed CEEC application form",
            "Business plan with financial projections",
            "PACRA certificate",
            "ZRA TPIN certificate",
            "NRC copy",
            "Bank statements (6 months if existing business)",
            "Collateral documents (for larger loans)",
        ],
        "website":      "https://www.ceec.org.zm",
        "contact":      "0211 256 888 / info@ceec.org.zm",
        "processing":   "6–16 weeks",
        "notes":        "CEEC prioritises citizen-owned businesses in manufacturing, agriculture, tourism, and trade. Interest rate is among the lowest available in Zambia.",
        "best_for":     ["manufacturing", "agriculture", "tourism", "trade", "processing"],
        "min_capital":  0,
    },
    {
        "id":           "dbz",
        "name":         "Development Bank of Zambia (DBZ)",
        "type":         "loan",
        "provider":     "DBZ",
        "color":        "#E8973E",
        "min_amount":   20_000,
        "max_amount":   10_000_000,
        "currency":     "ZMW",
        "interest_rate":"10–15% per annum (concessional for SMEs)",
        "repayment":    "Up to 10 years",
        "eligibility": [
            "Business registered with PACRA",
            "Viable bankable business plan",
            "Collateral typically required",
            "Good credit history preferred",
            "ZRA compliance",
        ],
        "requirements": [
            "Completed DBZ application",
            "Detailed business plan",
            "3 years audited/management accounts (existing business)",
            "Projected financial statements (3 years)",
            "PACRA and ZRA certificates",
            "Collateral documentation",
            "Directors'/owners' CVs",
        ],
        "website":      "https://www.dbz.co.zm",
        "contact":      "0211 228 576",
        "processing":   "8–20 weeks",
        "notes":        "DBZ focuses on development impact sectors: agriculture, manufacturing, tourism, housing, energy. Stronger preference for businesses creating employment.",
        "best_for":     ["agriculture", "manufacturing", "tourism", "housing", "energy", "export"],
        "min_capital":  10_000,
    },
    {
        "id":           "zanaco_sme",
        "name":         "ZANACO SME Business Loan",
        "type":         "loan",
        "provider":     "ZANACO",
        "color":        "#A855F7",
        "min_amount":   5_000,
        "max_amount":   500_000,
        "currency":     "ZMW",
        "interest_rate":"~24–28% per annum (market rate)",
        "repayment":    "12–60 months",
        "eligibility": [
            "ZANACO business account holder (or willing to open one)",
            "Business operating for at least 6 months",
            "Consistent revenue/cash flow evidence",
            "Valid PACRA and ZRA documentation",
        ],
        "requirements": [
            "6 months bank statements",
            "Business registration documents",
            "Financial statements or management accounts",
            "NRC of directors",
            "Business plan (for larger amounts)",
        ],
        "website":      "https://www.zanaco.co.zm",
        "contact":      "Your nearest ZANACO branch",
        "processing":   "2–6 weeks",
        "notes":        "ZANACO is the most accessible option for businesses with existing bank accounts. Faster processing than development institutions but at commercial interest rates.",
        "best_for":     ["retail", "services", "trade", "food", "transport"],
        "min_capital":  5_000,
    },
    {
        "id":           "fnb_sme",
        "name":         "FNB Zambia SME Finance",
        "type":         "loan",
        "provider":     "First National Bank Zambia",
        "color":        "#00F0C8",
        "min_amount":   10_000,
        "max_amount":   2_000_000,
        "currency":     "ZMW",
        "interest_rate":"~25–30% per annum",
        "repayment":    "12–84 months",
        "eligibility": [
            "Business registered and operating",
            "FNB business account preferred",
            "Minimum 12 months trading history",
            "Audited financials for amounts above K200,000",
        ],
        "requirements": [
            "Business registration documents",
            "12 months bank statements",
            "Financial statements",
            "Business plan",
            "Directors' personal details and NRC",
        ],
        "website":      "https://www.fnbzambia.co.zm",
        "contact":      "FNB Business Banking — nearest branch",
        "processing":   "2–8 weeks",
        "notes":        "FNB has strong SME lending capacity and a dedicated business banking team. Good option for businesses with solid trading history.",
        "best_for":     ["retail", "services", "manufacturing", "hospitality", "technology"],
        "min_capital":  5_000,
    },
    {
        "id":           "boz_sme",
        "name":         "BOZ Financial Inclusion Fund",
        "type":         "grant_loan",
        "provider":     "Bank of Zambia",
        "color":        "#FF4D6A",
        "min_amount":   5_000,
        "max_amount":   50_000,
        "currency":     "ZMW",
        "interest_rate":"Below-market (varies by programme)",
        "repayment":    "Varies by programme",
        "eligibility": [
            "Zambian citizen",
            "Underserved or rural area business preferred",
            "Women and youth-owned businesses prioritised",
            "Smallholder farmers and cooperatives",
        ],
        "requirements": [
            "Application through participating microfinance institutions",
            "Business plan or proposal",
            "NRC",
            "Proof of business activity",
        ],
        "website":      "https://www.boz.zm",
        "contact":      "Participating microfinance partners",
        "processing":   "4–10 weeks",
        "notes":        "BOZ financial inclusion programmes are disbursed through partner microfinance institutions. Prioritises rural, women-led, and youth-led businesses.",
        "best_for":     ["agriculture", "smallholder", "cooperative", "rural", "women", "youth"],
        "min_capital":  0,
    },
    {
        "id":           "empretec",
        "name":         "EMPRETEC Zambia / UNCTAD",
        "type":         "training_grant",
        "provider":     "UNCTAD / ZDA",
        "color":        "#FFB84D",
        "min_amount":   0,
        "max_amount":   50_000,
        "currency":     "ZMW",
        "interest_rate":None,
        "repayment":    "Grant (training + seed funding)",
        "eligibility": [
            "Zambian entrepreneur with growth ambition",
            "Willing to complete EMPRETEC training programme",
            "Business with growth potential",
        ],
        "requirements": [
            "Application to EMPRETEC programme",
            "Attendance at training workshop",
            "Business concept or plan",
        ],
        "website":      "https://www.zda.org.zm",
        "contact":      "Zambia Development Agency (ZDA)",
        "processing":   "Varies by intake",
        "notes":        "EMPRETEC combines entrepreneurship training with access to finance. Strong network of mentors and alumni. Particularly valuable for early-stage entrepreneurs.",
        "best_for":     ["startup", "growth", "technology", "innovation", "services"],
        "min_capital":  0,
    },
]


# ── Eligibility scoring ───────────────────────────────────────────────────────

def _score_match(source: dict, capital: float, sector: str, months_operating: int, location: str) -> int:
    """Returns 0-100 match score for a funding source."""
    score = 50  # base

    # Capital fit
    if capital >= source["min_capital"]:
        score += 15
    else:
        score -= 20

    # Sector fit
    sector_lower = (sector or "").lower()
    for s in source.get("best_for", []):
        if s.lower() in sector_lower or sector_lower in s.lower():
            score += 20
            break

    # Business maturity
    if source["id"] in ("ceec", "dbz") and months_operating < 6:
        score -= 15
    elif source["id"] in ("zanaco_sme", "fnb_sme") and months_operating < 6:
        score -= 25

    # Rural/urban bonus for BOZ
    location_lower = (location or "").lower()
    rural_areas = ["rural", "village", "farm", "district", "chief"]
    if source["id"] == "boz_sme" and any(r in location_lower for r in rural_areas):
        score += 20

    return min(100, max(0, score))


# ── Schemas ───────────────────────────────────────────────────────────────────

class FundingMatchRequest(BaseModel):
    business_name:      str
    business_sector:    str
    location:           Optional[str]  = None
    capital_needed:     Optional[float]= None
    months_operating:   Optional[int]  = 0
    current_employees:  Optional[int]  = 0
    purpose:            Optional[str]  = None  # what the loan is for

    @field_validator('capital_needed', mode='before')
    @classmethod
    def coerce_float(cls, v):
        if v is None or v == '': return None
        try: return float(str(v))
        except: return None

    @field_validator('months_operating', 'current_employees', mode='before')
    @classmethod
    def coerce_int(cls, v):
        if v is None or v == '': return 0
        try: return int(float(str(v)))
        except: return 0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/sources")
def get_all_sources():
    """Return all funding sources without personalisation."""
    return {"sources": FUNDING_SOURCES}


@router.post("/match")
async def match_funding(
    req: FundingMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Match a business profile to the most suitable funding sources.
    Returns scored and ranked list with AI guidance.
    """
    capital   = req.capital_needed or 0
    sector    = req.business_sector or ""
    months    = req.months_operating or 0
    location  = req.location or ""

    # Score each source
    scored = []
    for src in FUNDING_SOURCES:
        # Filter by amount if capital needed specified
        if capital > 0:
            if capital < src["min_amount"] * 0.5:
                continue  # asking for way less than minimum
            if capital > src["max_amount"] * 2:
                continue  # asking for way more than maximum

        score = _score_match(src, capital, sector, months, location)
        scored.append({**src, "match_score": score})

    # Sort by match score
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    top = scored[:5]

    # Generate AI guidance
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    ai_guidance = {}

    if api_key and top:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        sources_summary = "\n".join([
            f"- {s['name']}: K{s['min_amount']:,}–K{s['max_amount']:,}, {s['type']}, match score {s['match_score']}%"
            for s in top[:3]
        ])

        try:
            r = client.messages.create(
                model="claude-sonnet-4-6", max_tokens=600,
                messages=[{"role": "user", "content":
                    f"You are KIP, advising a Zambian entrepreneur.\n\n"
                    f"Business: {req.business_name}\n"
                    f"Sector: {sector}\n"
                    f"Location: {location or 'Zambia'}\n"
                    f"Capital needed: K{capital:,.0f}\n"
                    f"Months operating: {months}\n"
                    f"Purpose: {req.purpose or 'not specified'}\n\n"
                    f"Top matching funding sources:\n{sources_summary}\n\n"
                    f"Give 3 specific, actionable pieces of advice for this entrepreneur "
                    f"to successfully access funding from the top match. "
                    f"Reference Zambian context. Use ZMW. Be direct and practical. Under 200 words."
                }]
            )
            ai_guidance = {"advice": r.content[0].text}
        except Exception as e:
            ai_guidance = {"advice": None, "error": str(e)}

    return {
        "matches":    top,
        "total":      len(scored),
        "guidance":   ai_guidance,
        "business":   req.business_name,
        "sector":     sector,
        "location":   location,
        "capital":    capital,
    }


@router.get("/letter-types")
def get_letter_types():
    """Return available funding letter types."""
    return {
        "letter_types": [
            {"id": "loan_request_letter", "label": "Loan Request Letter",
             "desc": "Formal request to a bank or CEEC for business financing"},
            {"id": "cdf_application",     "label": "CDF Application Letter",
             "desc": "Letter to your MP or Ward office for CDF support"},
            {"id": "ceec_motivation",     "label": "CEEC Motivation Letter",
             "desc": "Motivation letter for CEEC empowerment funding"},
            {"id": "dbz_proposal",        "label": "DBZ Project Proposal",
             "desc": "Development project summary for DBZ consideration"},
            {"id": "introduction_letter", "label": "Business Introduction Letter",
             "desc": "Introduce your business to a potential funder or partner"},
        ]
    }
