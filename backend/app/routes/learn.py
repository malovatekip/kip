"""
KIP Learn — Sprint 17
Interactive financial literacy and health courses using FinScope 2025 framework.
Routes: courses, lessons, quiz, progress, badges.
"""
import os, json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sqlt
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.security import get_current_user
from app.models.user import User

router = APIRouter()

# ── FinScope-aligned course content ──────────────────────────────────────────
COURSES = [
    {
        "id": "financial_literacy_101",
        "title": "Financial Literacy 101",
        "subtitle": "Based on the Zambia FinScope 2025 Assessment Framework",
        "description": "Learn the four pillars of financial literacy as measured by the Bank of Zambia: numeracy, money management skills, financial attitudes, and financial behaviour. This course uses the exact framework from the FinScope 2025 national survey.",
        "icon": "📊",
        "color": "#2B7FFF",
        "badge_name": "Financially Literate",
        "badge_icon": "🎓",
        "difficulty": "Beginner",
        "estimated_mins": 25,
        "category": "financial_literacy",
        "lessons": [
            {
                "id": "fl_1",
                "title": "What Is Financial Literacy?",
                "content": """Financial literacy is your ability to understand and use money effectively. The Bank of Zambia's FinScope 2025 Survey measured financial literacy using a multidimensional score across four areas:

**1. Numeracy** — Can you do basic financial calculations? Percentages, interest, profit and loss?

**2. Skills & Competence** — Do you know how to budget, save, and plan financially?

**3. Attitude to Financial Services** — Do you see banks, savings groups, and insurance as useful tools?

**4. Financial Behaviour** — Do you actually practice good financial habits day to day?

The FinScope 2025 Survey found that only **46.1% of Zambian adults** scored 70% or above across these four areas — meaning they are financially literate. That means **53.9% are not** — over 6.6 million adults.

KIP Learn is designed to help you join the 46.1% — and eventually push that national number higher.""",
                "quiz": None,
            },
            {
                "id": "fl_2",
                "title": "Numeracy: The Foundation",
                "content": """You cannot run a profitable business without basic financial numeracy. Let's cover the four most important calculations every Zambian entrepreneur must know.

**1. Profit Margin**
Profit Margin = (Profit ÷ Revenue) × 100
*Example: Revenue K1,000, Cost K700. Profit = K300. Margin = 30%.*

**2. Break-Even Point**
Break-Even = Fixed Costs ÷ (Price per unit − Variable cost per unit)
*Example: Rent K500/month. Each item sells for K20, costs K12 to make. Break-even = 500 ÷ 8 = 63 items per month.*

**3. Simple Interest**
Interest = Principal × Rate × Time
*Example: Borrow K10,000 at 5% for 1 year = K500 interest. You repay K10,500.*

**4. Percentage Change**
% Change = ((New − Old) ÷ Old) × 100
*Example: Sales went from K3,000 to K3,600. Change = (600 ÷ 3000) × 100 = 20% increase.*""",
                "quiz": {
                    "question": "You buy 50 bags of charcoal for K1,500 and sell them all for K2,200. What is your profit margin?",
                    "options": ["20%", "31.8%", "46.7%", "68.2%"],
                    "correct": 1,
                    "explanation": "Profit = K2,200 − K1,500 = K700. Profit Margin = (700 ÷ 2200) × 100 = 31.8%. Note: profit margin is calculated on revenue, not cost."
                }
            },
            {
                "id": "fl_3",
                "title": "Budgeting & Cash Flow",
                "content": """The biggest reason small businesses fail in Zambia is not competition — it is poor cash flow management. More businesses die from running out of cash than from not making profit.

**What is Cash Flow?**
Cash flow is the movement of money in and out of your business. You can be profitable on paper but still fail if your cash flow is negative — meaning more money is going out than coming in.

**The Simple Business Budget**
Every week or month, write down:
- **Income:** All money coming IN (sales, services, other income)
- **Expenses:** All money going OUT (stock, rent, transport, phone, personal withdrawals)
- **Net:** Income − Expenses = your surplus or deficit

**The Most Important Rule**
Never mix business money with personal money. Open a separate bank account or mobile money wallet for your business. This single habit separates businesses that survive from those that don't.

**Emergency Reserve**
The FinScope 2025 survey found that 46.9% of Zambian men and 52.6% of women are very worried about not having enough money for monthly expenses. The solution is a cash reserve — aim to keep 1 month of operating costs in reserve at all times.""",
                "quiz": {
                    "question": "Your shop earns K4,500 this month. You spend K1,800 on stock, K600 on rent, K300 on transport, and withdraw K1,200 for personal use. What is your net cash flow?",
                    "options": ["K600", "K1,800", "K300", "K2,700"],
                    "correct": 0,
                    "explanation": "Total expenses = K1,800 + K600 + K300 + K1,200 = K3,900. Net = K4,500 − K3,900 = K600. This is a positive cash flow but the personal withdrawal is large — ideally pay yourself a fixed salary."
                }
            },
            {
                "id": "fl_4",
                "title": "Financial Attitudes & Behaviour",
                "content": """Knowledge alone does not make you financially literate. The FinScope framework measures your *attitude* toward financial tools and your actual *behaviour* with money.

**Financial Attitudes: Do you see these as tools or threats?**

- **Banks:** Many Zambians avoid banks because fees seem high or they feel unwelcome. But a business bank account gives you credibility with lenders, builds a transaction history, and protects your money.

- **Savings Groups (Chilimba):** The FinScope 2025 Survey found that Chilimba usage rose to 8% of adults in 2025. It is a proven, community-based savings mechanism — use it deliberately, not just socially.

- **Insurance:** Only 10.4% of Zambian adults use insurance. Yet 51.4% of men and 55.9% of women worry deeply about medical costs. Insurance is the most underused financial tool in Zambia.

- **Mobile Money:** 76.1% of Zambian adults now use mobile money — the highest driver of financial inclusion. It is your most accessible financial tool.

**Financial Behaviour: What do you actually do?**

The difference between people who are financially literate and those who are not often comes down to habits:
- Do you write down your income and expenses?
- Do you separate business and personal money?
- Do you save before you spend, or spend and save what's left?
- Do you read the terms before taking a loan?

Answer honestly. Behaviour is where most people need to improve.""",
                "quiz": {
                    "question": "Which of these is the BEST financial behaviour?",
                    "options": [
                        "Saving whatever is left at the end of the month",
                        "Paying yourself first, then covering expenses, then saving the rest",
                        "Keeping all business money in your personal mobile wallet for convenience",
                        "Taking a loan whenever you need stock rather than saving for it"
                    ],
                    "correct": 1,
                    "explanation": "Paying yourself first (a fixed salary) ensures you live within your means. Keeping separate accounts protects business capital. Saving before spending builds reserves. Taking loans for regular stock is expensive and creates dependency."
                }
            },
        ],
        "final_assessment": {
            "title": "FinScope Financial Literacy Assessment",
            "description": "This assessment uses questions aligned to the Bank of Zambia's FinScope 2025 multidimensional financial literacy framework. A score of 70%+ means you are financially literate.",
            "questions": [
                {
                    "q": "If you borrow K5,000 at an annual interest rate of 12%, how much interest will you pay after 6 months?",
                    "options": ["K600", "K300", "K60", "K150"],
                    "correct": 1,
                    "dim": "numeracy"
                },
                {
                    "q": "Which document proves your business is legally registered in Zambia?",
                    "options": ["NRC", "PACRA Certificate", "ZRA TPIN", "Bank Statement"],
                    "correct": 1,
                    "dim": "skills"
                },
                {
                    "q": "Your business makes K8,000 in revenue this month and your total costs are K5,500. What is your profit margin?",
                    "options": ["68.75%", "31.25%", "45.5%", "27.5%"],
                    "correct": 1,
                    "dim": "numeracy"
                },
                {
                    "q": "What is the purpose of a cash reserve in a business?",
                    "options": [
                        "To invest in property when possible",
                        "To cover expenses during slow months or emergencies",
                        "To pay dividends to business owners",
                        "To avoid paying tax"
                    ],
                    "correct": 1,
                    "dim": "skills"
                },
                {
                    "q": "Mobile money penetration in Zambia reached what level in 2025, according to FinScope?",
                    "options": ["58.4%", "69.4%", "76.1%", "80.1%"],
                    "correct": 2,
                    "dim": "attitude"
                },
                {
                    "q": "You earn K3,000 this week. The BEST financial behaviour is to:",
                    "options": [
                        "Spend freely and save whatever is left",
                        "Immediately reinvest all of it back into stock",
                        "Pay yourself a fixed amount, cover business costs, then save the rest",
                        "Keep it all in cash at home for easy access"
                    ],
                    "correct": 2,
                    "dim": "behaviour"
                },
                {
                    "q": "What is the break-even point for a business with fixed costs of K1,200/month, selling items at K40 each with a variable cost of K25 per item?",
                    "options": ["30 items", "48 items", "80 items", "60 items"],
                    "correct": 2,
                    "dim": "numeracy"
                },
                {
                    "q": "According to FinScope 2025, what percentage of Zambian adults are financially literate (score 70%+)?",
                    "options": ["23.6%", "39.1%", "46.1%", "69.4%"],
                    "correct": 2,
                    "dim": "attitude"
                },
                {
                    "q": "Which of these is an example of GOOD financial behaviour for a small business owner?",
                    "options": [
                        "Using the same mobile wallet for personal and business transactions",
                        "Keeping a daily record of income and expenses",
                        "Reinvesting all profits and never paying yourself",
                        "Taking a bank loan to pay for monthly operating costs"
                    ],
                    "correct": 1,
                    "dim": "behaviour"
                },
                {
                    "q": "If your sales increase from K6,000 to K7,800, what is the percentage increase?",
                    "options": ["13%", "23.1%", "30%", "18%"],
                    "correct": 2,
                    "dim": "numeracy"
                },
            ]
        }
    },
    {
        "id": "financial_health_101",
        "title": "Financial Health 101",
        "subtitle": "Based on the Bank of Zambia FinScope 2025 Health Framework",
        "description": "Understand and improve your financial health using the three-pillar framework from the Zambia FinScope 2025 Survey: managing everyday finances, coping with risk, and investing in your future.",
        "icon": "💚",
        "color": "#1AE06E",
        "badge_name": "Financially Healthy",
        "badge_icon": "🏆",
        "difficulty": "Beginner",
        "estimated_mins": 20,
        "category": "financial_health",
        "lessons": [
            {
                "id": "fh_1",
                "title": "What Is Financial Health?",
                "content": """Financial health is not just about having money — it is about how well you manage the money you have.

The Bank of Zambia measures financial health using three dimensions:

**1. Managing Everyday Finances**
Can you cover your daily expenses without stress? Do you track what you spend? Do you avoid spending more than you earn?

**2. Coping with Risk**
Do you have an emergency fund? Are you protected if something goes wrong — illness, crop failure, theft?

**3. Investing in Your Future**
Are you saving? Are you building assets? Are you growing your financial position year after year?

**The Zambia Reality (FinScope 2025)**
A person is considered financially healthy if their score is **70% or above** across all three dimensions. Only **39.1% of Zambian adults** reach this threshold. That means **60.9% — over 7.5 million adults — have poor or moderate financial health**.

The good news: financial health can be improved. It is not determined by how much you earn. It is determined by how you manage what you earn.""",
                "quiz": None,
            },
            {
                "id": "fh_2",
                "title": "Managing Everyday Finances",
                "content": """The first pillar of financial health is managing day-to-day money well. FinScope asks questions like: *Can you make ends meet? Do you have money left at the end of the month?*

**The Three Habits of Good Daily Financial Management**

**Habit 1: Track Everything**
Write down every kwacha that comes in and goes out. You cannot manage what you don't measure. A simple notebook works. A mobile money transaction history works. KIP's daily log works.

**Habit 2: Spend Less Than You Earn — Consistently**
This sounds obvious. But 52.6% of Zambian women and 46.9% of men are very worried about not having enough money for monthly expenses. The gap between income and expenses must be positive every month — even by a small amount.

**Habit 3: Plan Before the Month Starts**
Before the month begins, write down expected income and planned expenses. Then live by the plan. When unexpected expenses arise (and they will), the plan shows you where to cut.

**What Destroys Daily Financial Management**
- Impulse purchases
- Lending money that doesn't come back
- Not tracking small daily expenses (they add up)
- Business money and personal money in the same wallet""",
                "quiz": {
                    "question": "Which habit has the MOST impact on managing everyday finances?",
                    "options": [
                        "Earning more money",
                        "Tracking every kwacha that comes in and goes out",
                        "Avoiding banks entirely",
                        "Borrowing when needed rather than planning ahead"
                    ],
                    "correct": 1,
                    "explanation": "Tracking is the foundation of financial management. You can earn a lot and still be financially unhealthy if you don't know where the money goes. Tracking reveals patterns, highlights waste, and enables better decisions."
                }
            },
            {
                "id": "fh_3",
                "title": "Coping with Risk & Shocks",
                "content": """The second pillar of financial health is resilience — your ability to survive financial shocks.

**The Zambia Context**
FinScope 2025 found that 40.6% of Zambian adults experienced climate change effects in 2025 — drought, crop failure, flooding. 55.9% of women are very worried about medical costs if they face a serious illness.

These are real risks. Financial health means being prepared for them.

**The Three Layers of Financial Protection**

**Layer 1: Emergency Fund**
Save 1–3 months of living expenses in a separate, accessible account. This covers unexpected medical costs, a slow month in business, or a family emergency without forcing you into debt.

**Layer 2: Insurance**
Only 10.4% of Zambian adults use insurance. Yet it is the most cost-effective way to protect against catastrophic risk. NHIMA health insurance, funeral cover, and crop insurance (for farmers) are accessible and affordable.

**Layer 3: Diversification**
Do not depend on a single income source. If your only income is your shop and the shop struggles, you have no buffer. A second small income stream — even K500/month — provides resilience.

**Informal Safety Nets**
Chilimba (rotating savings groups) and village banks serve as informal insurance for many Zambians. They are valuable — but they should supplement, not replace, individual savings and formal protection.""",
                "quiz": {
                    "question": "What is the MINIMUM recommended emergency fund for a small business owner?",
                    "options": [
                        "K500 — enough for immediate emergencies",
                        "1–3 months of living and operating expenses",
                        "6 months of business revenue",
                        "Whatever you can save after all expenses"
                    ],
                    "correct": 1,
                    "explanation": "1–3 months of expenses provides a meaningful buffer against illness, slow business periods, or unexpected costs. K500 is too small for most real emergencies. 6 months of revenue is ideal but not essential to start."
                }
            },
        ],
        "final_assessment": {
            "title": "FinScope Financial Health Self-Assessment",
            "description": "Answer honestly. This assessment mirrors the Bank of Zambia's FinScope 2025 financial health measurement framework. Score 70%+ to earn your Financially Healthy badge.",
            "questions": [
                {
                    "q": "At the end of a typical month, you:",
                    "options": [
                        "Have money left over after all expenses",
                        "Break exactly even — nothing left",
                        "Run short and borrow to cover the gap",
                        "Don't really track it"
                    ],
                    "correct": 0,
                    "dim": "everyday"
                },
                {
                    "q": "If you faced an unexpected expense of K2,000 today (medical, emergency, repair), you would:",
                    "options": [
                        "Cover it from savings without stress",
                        "Cover it but it would hurt your finances",
                        "Have to borrow from family or kaloba",
                        "Not be able to cover it at all"
                    ],
                    "correct": 0,
                    "dim": "risk"
                },
                {
                    "q": "How do you currently track your business income and expenses?",
                    "options": [
                        "I record everything regularly (notebook, app, or KIP)",
                        "I track sometimes but not consistently",
                        "I keep a rough mental estimate",
                        "I don't track — I just check my balance"
                    ],
                    "correct": 0,
                    "dim": "everyday"
                },
                {
                    "q": "According to FinScope 2025, what percentage of Zambian adults are financially healthy (70%+ score)?",
                    "options": ["13.6%", "39.1%", "52.5%", "67.4%"],
                    "correct": 1,
                    "dim": "awareness"
                },
                {
                    "q": "Do you have an emergency fund covering at least 1 month of expenses?",
                    "options": [
                        "Yes, I have 1+ months saved and accessible",
                        "Partially — I have some savings but not a full month",
                        "No, but I plan to start one",
                        "No, and I have no immediate plan"
                    ],
                    "correct": 0,
                    "dim": "risk"
                },
                {
                    "q": "Compared to 12 months ago, your financial position is:",
                    "options": [
                        "Better — I have more savings or lower debt",
                        "About the same",
                        "Worse — I have more debt or fewer savings",
                        "I haven't thought about it"
                    ],
                    "correct": 0,
                    "dim": "future"
                },
                {
                    "q": "Do you separate business money from personal money?",
                    "options": [
                        "Yes — completely separate accounts or wallets",
                        "Mostly — I try to keep them separate",
                        "Sometimes — it depends on the situation",
                        "No — I use the same wallet for everything"
                    ],
                    "correct": 0,
                    "dim": "everyday"
                },
                {
                    "q": "What is your savings habit?",
                    "options": [
                        "I save a fixed amount before spending each month",
                        "I save whatever is left after spending",
                        "I save when I have a good month",
                        "I don't currently save"
                    ],
                    "correct": 0,
                    "dim": "future"
                },
            ]
        }
    },
    {
        "id": "starting_business_zambia",
        "title": "Starting a Business in Zambia",
        "subtitle": "Practical guide for Zambian entrepreneurs",
        "description": "Everything you need to legally register, financially plan, and successfully launch a business in Zambia — from PACRA registration to your first week of trading.",
        "icon": "🚀",
        "color": "#E8973E",
        "badge_name": "Zambian Entrepreneur",
        "badge_icon": "⚡",
        "difficulty": "Intermediate",
        "estimated_mins": 30,
        "category": "entrepreneurship",
        "lessons": [
            {
                "id": "sb_1",
                "title": "PACRA Registration",
                "content": """Every legitimate business in Zambia must be registered with PACRA — the Patents and Companies Registration Agency.

**Why register?**
- Opens doors to CEEC, DBZ, and CDF funding
- Allows you to open a business bank account
- Makes you eligible for government contracts
- Protects your business name

**How to register (step by step):**
1. Visit **pacra.org.zm** or go to the nearest PACRA office
2. Choose your business structure: Sole Trader (cheapest), Partnership, or Limited Company
3. Search for your proposed business name to confirm it's available
4. Complete the registration form (available online or at the office)
5. Pay the registration fee: approximately K250–K500 depending on structure
6. Receive your Certificate of Incorporation or Business Registration Certificate

**What you need:**
- Your NRC (National Registration Card)
- Proposed business name (have 2–3 alternatives)
- Physical address for the business
- Business registration fee

**Timeline:** 1–5 working days if done online, up to 2 weeks at the office.""",
                "quiz": {
                    "question": "Which of these is NOT a benefit of registering your business with PACRA?",
                    "options": [
                        "Access to CDF and CEEC funding",
                        "Protection of your business name",
                        "Guaranteed profit in the first year",
                        "Ability to open a business bank account"
                    ],
                    "correct": 2,
                    "explanation": "PACRA registration provides legal recognition, funding access, name protection, and banking access — but it does not guarantee profit. Profit comes from good management, market fit, and hard work."
                }
            },
        ],
        "final_assessment": {
            "title": "Zambian Entrepreneur Assessment",
            "description": "Test your knowledge of starting and running a business in Zambia.",
            "questions": [
                {
                    "q": "What does PACRA stand for?",
                    "options": [
                        "Patents and Companies Registration Agency",
                        "Public Accounts and Corporate Revenue Authority",
                        "Private and Commercial Registration Authority",
                        "Patents, Commerce, and Regulatory Agency"
                    ],
                    "correct": 0,
                    "dim": "knowledge"
                },
                {
                    "q": "Which government fund specifically targets Zambian citizens for business empowerment loans at 5% interest?",
                    "options": ["DBZ", "ZANACO", "CEEC", "BOZ"],
                    "correct": 2,
                    "dim": "knowledge"
                },
                {
                    "q": "Your business earns K12,000 in its first month. Costs are K8,400. Is this business viable?",
                    "options": [
                        "Yes — 30% profit margin is sustainable",
                        "No — the profit is too low",
                        "Cannot tell without knowing the owner's salary",
                        "Only if the rent is under K1,000"
                    ],
                    "correct": 0,
                    "dim": "finance"
                },
                {
                    "q": "What is the minimum recommended cash reserve for a new small business?",
                    "options": [
                        "1 week of operating costs",
                        "1 month of operating costs",
                        "6 months of revenue",
                        "No reserve needed — reinvest everything"
                    ],
                    "correct": 1,
                    "dim": "finance"
                },
                {
                    "q": "CDF stands for:",
                    "options": [
                        "Community Development Finance",
                        "Constituency Development Fund",
                        "Central Development Foundation",
                        "Citizens Development Facility"
                    ],
                    "correct": 1,
                    "dim": "knowledge"
                },
            ]
        }
    },
]

BADGES = {
    "Financially Literate": {"icon": "🎓", "color": "#2B7FFF", "course": "financial_literacy_101", "min_score": 70},
    "Financially Healthy": {"icon": "🏆", "color": "#1AE06E", "course": "financial_health_101", "min_score": 70},
    "Zambian Entrepreneur": {"icon": "⚡", "color": "#E8973E", "course": "starting_business_zambia", "min_score": 70},
    "KIP Scholar": {"icon": "🌟", "color": "#E8973E", "course": None, "min_score": None, "special": "complete_all"},
}


# ── DB helpers ────────────────────────────────────────────────────────────────

def _ensure_tables(db: Session):
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS learn_progress (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            course_id    TEXT NOT NULL,
            lesson_id    TEXT,
            completed    INTEGER DEFAULT 0,
            score        REAL,
            answers      TEXT,
            created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at   TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, course_id, lesson_id)
        )
    """))
    db.execute(sqlt("""
        CREATE TABLE IF NOT EXISTS user_badges (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            badge_name   TEXT NOT NULL,
            course_id    TEXT,
            score        REAL,
            earned_at    TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, badge_name)
        )
    """))
    db.commit()


def _get_progress(user_id: int, db: Session) -> dict:
    rows = db.execute(sqlt("""
        SELECT course_id, lesson_id, completed, score
        FROM learn_progress WHERE user_id = :uid
    """), {"uid": user_id}).fetchall()
    result = {}
    for r in rows:
        cid = r[0]
        if cid not in result:
            result[cid] = {"lessons": {}, "assessment_score": None, "assessment_completed": False}
        if r[1]:
            result[cid]["lessons"][r[1]] = {"completed": bool(r[2]), "score": r[3]}
        else:
            result[cid]["assessment_score"] = r[3]
            result[cid]["assessment_completed"] = bool(r[2])
    return result


def _get_badges(user_id: int, db: Session) -> list:
    rows = db.execute(sqlt("""
        SELECT badge_name, course_id, score, earned_at
        FROM user_badges WHERE user_id = :uid
    """), {"uid": user_id}).fetchall()
    return [{"name": r[0], "course_id": r[1], "score": r[2], "earned_at": r[3],
             **{k: v for k, v in BADGES.get(r[0], {}).items() if k != 'special'}}
            for r in rows]


# ── Schemas ───────────────────────────────────────────────────────────────────

class LessonCompleteRequest(BaseModel):
    course_id: str
    lesson_id: str

class AssessmentSubmitRequest(BaseModel):
    course_id: str
    answers:   List[int]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/courses")
def get_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_tables(db)
    progress = _get_progress(current_user.id, db)
    badges   = {b["name"] for b in _get_badges(current_user.id, db)}
    result   = []
    for c in COURSES:
        p = progress.get(c["id"], {})
        lessons_done = sum(1 for l in p.get("lessons", {}).values() if l["completed"])
        result.append({
            "id":          c["id"],
            "title":       c["title"],
            "subtitle":    c["subtitle"],
            "description": c["description"],
            "icon":        c["icon"],
            "color":       c["color"],
            "difficulty":  c["difficulty"],
            "estimated_mins": c["estimated_mins"],
            "category":    c["category"],
            "badge_name":  c["badge_name"],
            "badge_icon":  c["badge_icon"],
            "lesson_count": len(c["lessons"]),
            "lessons_completed": lessons_done,
            "assessment_completed": p.get("assessment_completed", False),
            "assessment_score": p.get("assessment_score"),
            "badge_earned": c["badge_name"] in badges,
            "progress_pct": int((lessons_done / max(len(c["lessons"]), 1)) * 100),
        })
    return {"courses": result}


@router.get("/courses/{course_id}")
def get_course(course_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_tables(db)
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    p = _get_progress(current_user.id, db).get(course_id, {})
    return {
        **{k: v for k, v in course.items() if k != "final_assessment"},
        "progress": p,
        "assessment_title": course["final_assessment"]["title"],
        "assessment_description": course["final_assessment"]["description"],
        "question_count": len(course["final_assessment"]["questions"]),
    }


@router.post("/complete-lesson")
def complete_lesson(
    req: LessonCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_tables(db)
    db.execute(sqlt("""
        INSERT INTO learn_progress (user_id, course_id, lesson_id, completed, updated_at)
        VALUES (:uid, :cid, :lid, 1, :now)
        ON CONFLICT(user_id, course_id, lesson_id) DO UPDATE SET completed=1, updated_at=:now
    """), {"uid": current_user.id, "cid": req.course_id, "lid": req.lesson_id, "now": datetime.utcnow().isoformat()})
    db.commit()
    return {"status": "ok", "lesson_id": req.lesson_id}


@router.post("/submit-assessment")
def submit_assessment(
    req: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _ensure_tables(db)
    course = next((c for c in COURSES if c["id"] == req.course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    questions = course["final_assessment"]["questions"]
    if len(req.answers) != len(questions):
        raise HTTPException(status_code=400, detail=f"Expected {len(questions)} answers.")

    correct = sum(1 for i, q in enumerate(questions) if req.answers[i] == q["correct"])
    score   = round((correct / len(questions)) * 100, 1)
    passed  = score >= 70

    # Save assessment result
    db.execute(sqlt("""
        INSERT INTO learn_progress (user_id, course_id, lesson_id, completed, score, answers, updated_at)
        VALUES (:uid, :cid, NULL, :done, :score, :ans, :now)
        ON CONFLICT(user_id, course_id, lesson_id) DO UPDATE SET
            completed=:done, score=:score, answers=:ans, updated_at=:now
    """), {
        "uid": current_user.id, "cid": req.course_id,
        "done": 1 if passed else 0,
        "score": score, "ans": json.dumps(req.answers),
        "now": datetime.utcnow().isoformat()
    })
    db.commit()

    badge_earned = None
    if passed:
        badge_name = course["badge_name"]
        db.execute(sqlt("""
            INSERT INTO user_badges (user_id, badge_name, course_id, score, earned_at)
            VALUES (:uid, :bn, :cid, :score, :now)
            ON CONFLICT(user_id, badge_name) DO UPDATE SET score=:score, earned_at=:now
        """), {"uid": current_user.id, "bn": badge_name, "cid": req.course_id,
               "score": score, "now": datetime.utcnow().isoformat()})
        db.commit()
        badge_earned = {"name": badge_name, **BADGES.get(badge_name, {})}

        # Check for KIP Scholar (all courses completed)
        all_done = all(
            db.execute(sqlt("""
                SELECT COUNT(*) FROM learn_progress
                WHERE user_id=:uid AND course_id=:cid AND lesson_id IS NULL AND completed=1
            """), {"uid": current_user.id, "cid": c["id"]}).fetchone()[0] > 0
            for c in COURSES
        )
        if all_done:
            db.execute(sqlt("""
                INSERT INTO user_badges (user_id, badge_name, course_id, score, earned_at)
                VALUES (:uid, 'KIP Scholar', NULL, 100, :now)
                ON CONFLICT(user_id, badge_name) DO NOTHING
            """), {"uid": current_user.id, "now": datetime.utcnow().isoformat()})
            db.commit()

    results = [
        {
            "question": questions[i]["q"],
            "your_answer": questions[i]["options"][req.answers[i]],
            "correct_answer": questions[i]["options"][questions[i]["correct"]],
            "correct": req.answers[i] == questions[i]["correct"],
            "explanation": questions[i].get("explanation", ""),
        }
        for i in range(len(questions))
    ]

    return {
        "score":        score,
        "passed":       passed,
        "correct":      correct,
        "total":        len(questions),
        "badge_earned": badge_earned,
        "results":      results,
        "message": (
            f"Excellent! You scored {score}% and earned the '{course['badge_name']}' badge!"
            if passed else
            f"You scored {score}%. You need 70% to pass. Review the lessons and try again!"
        )
    }


@router.get("/my-progress")
def get_my_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_tables(db)
    badges   = _get_badges(current_user.id, db)
    progress = _get_progress(current_user.id, db)
    return {
        "badges":   badges,
        "progress": progress,
        "total_badges": len(badges),
        "courses_completed": sum(
            1 for p in progress.values() if p.get("assessment_completed")
        ),
    }
