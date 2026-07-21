# KIP — ZICTA Innovation Challenge Technical Presentation

**Speaker script** for `KIP_ZICTA_Presentation.pptx` (8 slides, ~3.5 minutes spoken).
Same text is embedded in the PowerPoint file's Notes pane for use in Presenter View — this
file is for offline rehearsal.

Target pace: ~140 words/minute. Total script ≈ 480 words ≈ 3.4 minutes, leaving buffer inside
your 20-minute slot for Q&A.

---

## Slide 1 — Title (≈10–15s)

> Good morning. Thank you for the time today. I'm going to walk you through KIP — the Kwacha
> Intelligence Platform — in about three to four minutes. I'll focus on two things: what the
> platform actually does, and how it's technically built. At the end I'll be upfront about the
> technical challenges we're still working through.

---

## Slide 2 — What KIP Does (≈25s)

> So what is KIP? It's one AI advisor that stays with the entrepreneur across three connected
> products. First, **idea generation and advice** — a chat-based advisor grounded in Zambian
> economic data. Second, **business operations** — once someone accepts an idea, KIP turns it
> into a live dashboard with a launch plan, daily logging, and forecasting. And third,
> **learning and simulation** — a financial literacy course and a full business simulation
> game called BizSim, so people can practice decisions before risking real money.

---

## Slide 3 — System Architecture (≈30s)

> Technically, KIP is a fairly standard modern web stack with an AI layer on top. React and
> Vite on the frontend, deployed on Vercel. FastAPI and SQLAlchemy on the backend, deployed on
> Fly.io, talking to SQLite in development and Postgres in production, with stateless JWT
> authentication. The intelligence layer is the Anthropic Claude API combined with a ChromaDB
> vector database for retrieval-augmented generation — that's what grounds the AI's advice in
> real Zambian data rather than generic knowledge. We also pull in live data: OpenStreetMap for
> local business density, news and currency feeds, and a translation API for local languages.

---

## Slide 4 — Feature 1: AI Business Advisor "K-BIG-1" (≈30s)

> The core of KIP is what we call K-BIG-1, the Kwacha Business Idea Generator. When a user
> chats with it, we don't just forward their message to an AI model. We first run
> retrieval-augmented generation — a semantic search over a curated Zambian knowledge base in
> ChromaDB — and we pull in location intelligence: real town-level economic profiles and
> OpenStreetMap business density data. All of that gets assembled into the prompt we send to
> Claude, along with the conversation history. When Claude's reply matches a structured
> recommendation format, we automatically detect and save that idea to the user's account.

---

## Slide 5 — Feature 2: Business Dashboard & Daily Operations (≈30s)

> Once an idea is accepted, KIP generates a week-by-week launch plan with Claude, using real
> Zambian specifics — registration costs, tax thresholds, financing sources. From there, the
> owner logs each day's revenue, expenses, customers and stock. On the forecasting side, we run
> a scikit-learn linear regression model over the day index and a sine-cosine encoding of the
> day of week, so the model understands that Sunday and Monday are close together, not far
> apart. Every log entry also triggers an AI coaching message that references that day's actual
> numbers, not generic advice.

---

## Slide 6 — Feature 3: BizSim — Gamified Business Simulation (≈30s)

> BizSim is our gamified simulation — thirty days, six different Zambian business types, each
> starting with an inherited debt and a named AI rival. Under the hood it's a real economic
> simulation, not just a random number generator: there's a genuine double-entry bookkeeping
> ledger that enforces debits equal credits before any transaction is even written, a demand
> model that factors in price, marketing, market conditions and the competitor's behaviour, and
> business-specific risk mechanics like spoilage or currency swings. Claude drives the rival's
> negotiation style, the loan officer, and weekly coaching, and the daily events are seeded
> deterministically so the game is reproducible and fair.

---

## Slide 7 — Feature 4: Localization & Capital Access (≈30s)

> Two more pieces worth showing technically. First, localization: the UI and AI content
> translate into five Zambian languages through a translation API, cached in SQLite so we only
> pay for each unique string once. For Bemba specifically, we don't do literal translation — we
> prompt-engineer Claude to code-switch naturally between Bemba and English business terms, the
> way people actually speak. Second, capital access: we score a user's business profile against
> seven real Zambian funding sources — CEEC, DBZ, ZANACO and others — with a heuristic matching
> engine, then hand the top matches to Claude to generate specific, actionable guidance.

---

## Slide 8 — Technical Challenges We're Solving (≈30s)

> Finally, I want to be direct about where we're focused right now, because I think that
> matters as much as the features. Five things: wiring our existing usage-limit code into every
> AI endpoint so we have real cost control; moving off ad hoc SQLite table creation toward
> proper schema migrations as we prepare for PostgreSQL in production; making our AI calls run
> asynchronously so they don't block other users; adding rate limiting on authentication and
> public endpoints before we take on open traffic; and rebuilding payment integration cleanly
> after a recent refactor removed the old version.
>
> That's KIP — what it does, and how it's built. Happy to go deeper on any part of this.

---

## Timing summary

| Slide | Topic | Approx. time |
|---|---|---|
| 1 | Title | 10–15s |
| 2 | What KIP does | 25s |
| 3 | System architecture | 30s |
| 4 | AI Advisor (K-BIG-1) | 30s |
| 5 | Business Dashboard | 30s |
| 6 | BizSim | 30s |
| 7 | Localization & Capital Access | 30s |
| 8 | Technical challenges | 30s |
| **Total** | | **~3.5–4 min** |

## Delivery notes

- Slide 3 and Slide 8 are the two slides most likely to draw follow-up questions from a
  technical supervisor — know the file names underneath each bullet if asked (e.g.
  `kip_engine.py` for the AI orchestration, `bizsim_engine.py` for the simulation ledger).
- Don't rush slide 8 — leading with challenges you're *already aware of and actively fixing*
  reads as engineering maturity, not a weakness to downplay.
- If asked "why not just call the AI directly without RAG?" — the answer is grounding: Claude's
  general knowledge doesn't know PACRA registration fees or ZRA turnover-tax thresholds; the
  RAG layer and the hardcoded Zambia constants are what make answers locally accurate.
