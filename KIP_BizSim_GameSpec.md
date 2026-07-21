# KIP BizSim — Complete Game Specification
# Agent Prompt for Full Implementation
# ============================================================
# Project: Kwacha Intelligence Platform (KIP)
# Feature: KIP Business Simulator (BizSim) — Full Gamification Upgrade
# Stack: Python FastAPI backend · React 18 + Vite frontend · SQLite · Tone.js · HTML5 Canvas
# Author: Paul Maloba, Malovate Limited
# Context: ZICTA 2026 ICT Innovation Programme — Top 4 of 100
# ============================================================

## MISSION STATEMENT

Transform KIP BizSim from a functional educational tool into an emotionally
engaging, genuinely addictive business simulation game that teaches real
Zambian financial literacy through consequence, not instruction. Players
must never feel like they are studying. They must feel like they are
running a real business and fighting for survival.

The gold standard: a player who loses on Day 12 should immediately want
to start again because they now know what they did wrong.

---

## PART 1 — ARCHITECTURE OVERVIEW

### Backend (Python FastAPI + SQLite)
Files to create/modify:
  backend/app/routes/bizsim_routes.py   — all game API endpoints
  backend/app/routes/bizsim_engine.py   — simulation logic, demand function

New database tables required:
  bizsim_sessions      — core game state (already exists, extend it)
  bizsim_ledger        — double-entry accounting (already exists)
  bizsim_messages      — supplier/customer/AI conversations (already exists)
  bizsim_events_log    — record of all event cards played per session
  bizsim_upgrades      — purchased shop upgrades per session
  bizsim_stats         — cumulative player statistics across all runs
  bizsim_rivals        — AI rival state per session

New session columns to add (ALTER TABLE via PRAGMA check):
  story_id             TEXT    — which story variant was chosen
  debt_balance         REAL    — outstanding debt (starts at story amount)
  debt_due_day         INTEGER — day debt must be repaid by
  debt_lender          TEXT    — who the debt is owed to
  reputation           REAL    — business reputation score (0-100)
  chilulu              REAL    — charisma/charm stat (0-100)
  supplier_relationship INTEGER — days of consistent fair dealing with supplier
  family_reputation    REAL    — family/community standing (0-100)
  rival_id             TEXT    — the AI rival assigned to this session
  rival_profit         REAL    — rival's running profit (for leaderboard)
  ghost_data           TEXT    — JSON of best previous run for ghost overlay
  phase                INTEGER — game phase 1, 2, or 3
  upgrades_purchased   TEXT    — JSON list of upgrade IDs bought

### Frontend (React 18 + Vite + TailwindCSS + Tone.js)
Files to create:
  frontend/src/pages/BizSimPage.jsx            — main game shell
  frontend/src/components/bizsim/
    StorySetup.jsx        — narrative intro + business selection
    DayCanvas.jsx         — HTML5 canvas day animation
    EventCard.jsx         — daily event card with choices
    DecisionPanel.jsx     — stock, price, marketing, save decisions
    DayResult.jsx         — results breakdown with animations
    NegotiationChat.jsx   — supplier negotiation with patience meter
    CustomerChat.jsx      — customer conversations with Chilulu stat
    LoanOfficer.jsx       — AI loan officer interface
    ShopUpgrades.jsx      — upgrade tree UI
    LusakaNewspaper.jsx   — daily newspaper with market hints
    FinancialStatements.jsx — P&L, balance sheet, cash flow charts
    Leaderboard.jsx       — live leaderboard with rival highlighted
    Missions.jsx          — mission progress tracker
    FinalReport.jsx       — end-game report card
    GameAudio.jsx         — Tone.js audio engine (singleton)
    BreakEvenCounter.jsx  — persistent break-even display

---

## PART 2 — THE SIX BUSINESS TYPES WITH STORY HOOKS

Each business type must have:
  - A unique story (the "why" — emotional investment)
  - A named Zambian rival (the psychological driver)
  - A specific debt amount, lender, and deadline
  - A unique mechanical feature that teaches a distinct financial concept

### 1. GROCERY KIOSK
  Location:  Kabwata Market, Lusaka
  Capital:   K3,000 starting cash
  Story:     "Your grandmother Mama Bupe ran this market stall for 30 years.
              When she passed last month, she left it to you — but also left
              a K8,000 debt to Mr. Kamau, the local Kaloba lender.
              He gives you 30 days to pay it back, or he takes the stall.
              You have K3,000. The stall opens tomorrow."
  Rival:     Mulenga from the stall next door. Smug, well-stocked, always
              undercutting your prices. He opens on Day 1 with K5,000.
  Debt:      K8,000 due by Day 30 at 60% p.a. (compounds daily)
  Mechanic:  Perishables — 5% of unsold stock spoils every day.
             Teaches: inventory management, sell-through rate.
  Teaches:   Pricing, gross margin, perishable goods, daily cash flow

### 2. POULTRY FARM
  Location:  Chongwe District, Lusaka Province
  Capital:   K5,000 starting cash
  Story:     "Your uncle Cosmas ran this broiler farm for 15 years before
              drought killed half his flock. He borrowed K15,000 from DBZ
              to restock. The farm is yours now — so is the loan.
              DBZ charges 12% p.a. You have 30 days before the first
              repayment is due. The farm has 50 birds today. Make them count."
  Rival:     Blessings Farm, 2km down the road. Bigger operation.
              They undercut your price by K5/bird on Fridays.
  Debt:      K15,000 DBZ loan at 12% p.a., first payment due Day 15
  Mechanic:  Growth cycle (6 days to maturity) + mortality rate (3% daily).
             Teaches: production planning, mortality risk, B2B sales.
  Teaches:   Supply chain, demand forecasting, B2B pricing

### 3. RESTAURANT
  Location:  Cairo Road, Lusaka CBD
  Capital:   K4,000 starting cash
  Story:     "You quit your government job to open this restaurant with
              your cousin Priscilla. She contributed K10,000 in savings —
              your share was supposed to be K10,000 too, but you only had
              K4,000. Priscilla agreed to wait for her share of the profit.
              If you can't show her K6,000 in profit within 30 days, she's
              pulling out and taking her K10,000 back. The restaurant opens Monday."
  Rival:     Chef Mulilo's Kitchen, 3 doors down. Faster service, cheaper menu.
  Debt:      K6,000 profit owed to cousin by Day 30 (not cash debt — profit target)
  Mechanic:  Waste rate (12% of daily prep wasted) + staffing costs.
             Teaches: waste management, operating leverage.
  Teaches:   Cost control, waste reduction, staffing, volume vs margin

### 4. TRANSPORT BUSINESS
  Location:  Kafue Road, Lusaka
  Capital:   K8,000 starting cash
  Story:     "You bought a secondhand minibus with K20,000 from a
              microfinance company (Bayport). Monthly repayments are K2,400.
              Day 15 and Day 30 are repayment days. If you miss a payment,
              Bayport sends someone to repossess the bus.
              You have K8,000 for fuel and operations. The route starts today."
  Rival:     Freddy's Express — same route, newer bus, charges slightly less.
  Debt:      K2,400 due Day 15 and Day 30 (microfinance repayments)
  Mechanic:  Breakdown risk (4% daily chance, K500-K2000 repair cost).
             Teaches: asset maintenance, variable costs, route planning.
  Teaches:   Fuel management, fixed asset risk, cash flow planning

### 5. PHONE ACCESSORIES SHOP
  Location:  Arcades Shopping Centre, Lusaka
  Capital:   K5,000 starting cash
  Story:     "Your older brother Kelvin flew to Dubai and shipped you
              K30,000 worth of phone accessories on credit. He trusted you.
              He needs the K30,000 back in 30 days — he has a mortgage
              payment in Dubai that depends on it.
              Exchange rate today: K27.50/USD. Every time it moves, your
              restock costs change. Your brother is watching your progress."
  Rival:     iTech Accessories, two stalls away. Same products, better display.
  Debt:      K30,000 inventory credit to brother, due Day 30
  Mechanic:  USD/ZMW exposure (restock cost fluctuates with exchange rate).
             Teaches: currency risk, import costs, working capital.
  Teaches:   FX risk, import business, retail margins, trend volatility

### 6. FOOD STALL
  Location:  Kamwala Market, Lusaka
  Capital:   K2,000 starting cash
  Story:     "You are the sole provider for your mother, two younger sisters,
              and your sister's baby. K800 goes to rent and school fees
              every 15 days — non-negotiable. Miss it and the landlord kicks
              you all out.
              You have K2,000. The stall is borrowed from Mrs. Phiri next door.
              She charges K100/day to use it. If you can save K5,000 in 30 days,
              you can sign your own lease and stop paying Mrs. Phiri."
  Rival:     Mama Janet's Kitchen, the original stall three spots away.
              Known, trusted, has loyal customers. She charges K5 more per plate.
  Debt:      K800 due Day 15 (rent + fees), K800 due Day 30 + K100/day stall fee
  Mechanic:  Weather sensitivity (rain drops customers 25-30%), daily prep waste 8%.
             Teaches: working capital, price sensitivity, daily cash dependence.
  Teaches:   Microeconomics, daily survival finance, price elasticity

---

## PART 3 — THE RIVAL SYSTEM

Each session has one AI rival — the business type's named rival from Part 2.

### Rival Mechanics
  - Rival profit is simulated daily using a simplified demand model
  - Rival uses a randomised but sensible pricing strategy based on personality
  - Rival personality types:
      AGGRESSIVE: always undercuts player by 5-10%, accepts thin margins
      PREMIUM:    charges 20-30% above optimal, targets quality customers
      CONSISTENT: steady pricing, never panics, methodical
      REACTIVE:   mirrors player's price moves with a 1-day lag

  - Rival is ALWAYS visible on the leaderboard with their running profit
  - On certain days, the rival appears as an "NPC event":
      Day 1:  Rival trash-talks player ("That stall is dying, my friend.")
      Day 7:  Rival brags if ahead ("You should come work for me.")
      Day 15: Rival offers to "buy you out" at a low price (player can refuse)
      Day 25: If player is ahead, rival panics and cuts prices aggressively
      Day 30: Final leaderboard reveal

### Rival Dialogue (Mulenga for Grocery Kiosk example)
  Day 1:  "Ah, Mama Bupe's grandchild! Welcome. Don't worry, I'll take
           care of your customers when you close down. It won't be long."
  Day 7:  "K{rival_profit} so far this week. How about you?"
  Day 15: "I hear Mr. Kamau visited you. I can buy the stall from you
           right now for K6,000. Think about it."
  Day 25: "Fine. I'm dropping prices. Let's see who blinks first."

  [All rival dialogue must be generated by Claude in context, using
   the session's actual profit comparison data]

---

## PART 4 — THE DAILY GAME LOOP

Each day follows this exact sequence:

  1. MORNING NEWSPAPER (LusakaNewspaper.jsx)
     A full-screen newspaper front page animates in (CSS slide-down).
     Headline + 2-3 market hints. Some are accurate, some are rumours.
     Player taps "Start the Day" to proceed.

  2. EVENT CARD (EventCard.jsx)
     If a daily event is scheduled, a card flips in (CSS card flip animation).
     Player must make a choice before proceeding to decisions.
     Event card choices affect: cash, customers, reputation, or future events.

  3. DECISIONS (DecisionPanel.jsx)
     Stock purchase (slider) — with break-even counter visible
     Selling price (slider) — price guidance label updates in real time
     Marketing spend (K0 / K50 / K150 / K300)
     Save from revenue (slider)
     Optional: Open supplier negotiation (patience meter visible)
     Optional: Talk to a customer (one of 3 available today)

  4. DAY ANIMATION (DayCanvas.jsx — HTML5 Canvas)
     3-4 second animated sequence (described fully in Part 5)

  5. RESULTS (DayResult.jsx)
     Animated numbers counting up
     Demand factor breakdown (why you got X customers)
     Event impacts shown
     Profit/loss with colour feedback
     Break-even achieved? Yes/No badge
     Rival comparison for the day

  6. COACHING (if Day 7, 14, 21, 28)
     Claude generates personalised coaching based on the week's actual data

---

## PART 5 — THE DAY ANIMATION (HTML5 Canvas)

This is the most important visual feature. It runs for 3-4 seconds and
makes every day feel like a real event rather than a form submission.

### Canvas Layout (mobile-first, 375x260px minimum)
  Left side (40%):  Shop front illustration (vector SVG, static)
  Right side (60%): Street/market scene with animated elements

### Animation Sequence (in order)

  Frame 0-0.5s: SHOP OPENS
    Two doors swing open (CSS transform rotate from closed to open)
    Sound: door creak + market ambience fade in (Tone.js)

  Frame 0.5-2.5s: CUSTOMER FLOW
    Customer dots (small circle SVGs, 8-12px) appear from the right edge
    They walk left toward the shop (requestAnimationFrame linear movement)
    Customer behaviour determined by today's demand factors:

    If price_factor > 1.2 (cheap pricing):
      Dots rush in, bunched together, fast movement
      Green "🙂" emoji floats above each entering dot
      Ka-ching sound plays for each sale (Tone.js, staggered)
      "+K{price}" floating text rises and fades above shop door

    If price_factor < 0.7 (expensive pricing):
      Some dots walk toward the shop, then STOP
      A "$!@#" thought bubble appears above them
      They reverse direction and walk away
      A buzzer sound plays (Tone.js)

    If competitor_factor < 0.8 (competitor undercutting):
      Some dots fork LEFT toward a "Mulenga's Shop" sign
      Rival shop shows customers entering

    If marketing_factor > 1.3 (high marketing):
      Extra dots appear from top of screen (new customers drawn in)
      Small megaphone icon pulses in top corner

    If load shedding event:
      Canvas dims to 40% brightness
      Flickering effect on shop front
      Fewer dots, they move slower

    If rain event:
      Animated rain drops (simple vertical lines) overlay the scene
      Dots carry umbrella icons, fewer in number

  Frame 2.5-3.5s: END OF DAY
    Shop doors close
    Cash register animation (drawer opens, closes)
    Final "+K{revenue}" figure rises large from the register
    Sound: upbeat resolution chord if profitable, minor chord if loss (Tone.js)

  Frame 3.5s: AUTO-TRANSITION to results screen

### Canvas Technical Notes
  - Use React useRef for the canvas element
  - All drawing via canvas 2D context
  - Customer dots = circles with shadow, not images (performance)
  - Floating text = canvas fillText with opacity fade using requestAnimationFrame
  - Sound via Tone.js Synth — no external audio files needed
  - Canvas must be responsive: scale to viewport width on mobile

---

## PART 6 — THE DAILY EVENT CARD SYSTEM

### Card Design
  Full-width card that slides up from bottom (CSS translate animation)
  Card has: category badge, dramatic title, flavour text (2-3 sentences),
  exactly 2-4 choice buttons, consequences shown AFTER choosing
  Player must choose before proceeding — cannot skip

### Event Categories & Examples

  ZAMBIAN REALITY (infrastructure)
    "Load Shedding!"
      Flavour: "ZESCO just switched off your area. 8 hours of darkness."
      A. Buy generator fuel — spend K150, keep 90% customers
      B. Wait it out — lose 40% of today's customers
      C. Close early — keep your cash, lose the full day's revenue

    "Water Cuts"
      Flavour: "No water for 4 hours. Your restaurant/stall cannot operate."
      A. Buy bottled water — K80 spend, continue at reduced capacity
      B. Partner with next stall for shared supply — lose 15% margin today
      C. Close the kitchen — zero revenue, save costs

    "Fuel Price Hike"
      Flavour: "ZESCO raised fuel prices. Your supplier's delivery costs rise."
      Immediate: COGS increases 8% for the next 3 days
      Player is informed but cannot prevent it — teaches external macro impact

  SOCIAL / FAMILY (community obligations)
    "The Cousin's Wedding"
      Flavour: "Your cousin Chanda is getting married in Ndola on Saturday.
                The family expects K500 from you."
      A. Pay K500 — lose cash, gain +15 Family Reputation
      B. Send K200 — lose K200, Family Reputation +5, some grumbling
      C. Refuse — save cash, Family Reputation -20, "You'll hear about this"

    "The Uncle's Request"
      Flavour: "Uncle Sata needs K300 to fix his taxi. He says he'll repay
                you in two weeks. He hasn't repaid anything since 2019."
      A. Give K300 — lose cash, +Family Reputation, almost certainly never repaid
      B. Give K100 — compromise
      C. Refuse — save cash, Family Reputation -10

    "School Fees Season"
      Flavour: "Your younger sister's school fees are due. K450. Mum is asking."
      A. Pay — K450 cash loss, Family Reputation +20
      B. Negotiate for next week — buys time, no immediate cost
      C. Refuse — Family Reputation -30, "She drops out"

  MARKET SHOCKS (competitive)
    "Cheap Knockoffs"
      Flavour: "A new vendor is selling fake versions of your product at 40% less."
      A. Slash prices to match — margins drop 20% for 3 days
      B. Market your authenticity — spend K100, customers who care stay
      C. Ignore it — lose 15% of customers for 5 days

    "Viral Moment"
      Flavour: "Someone posted a TikTok of your stall and it's getting views."
      A. Capitalise — spend K50 on supplies, customers surge +40% for 2 days
      B. Do nothing — +20% customers anyway, no spend
      Consequence teaches: social media has compounding returns

    "Supplier Strike"
      Flavour: "Your main supplier's workers are striking. No delivery today."
      A. Buy from emergency supplier — 20% higher COGS today only
      B. Sell out of existing stock — cannot restock today
      C. Close for the day — teaches the value of backup suppliers

  OPPORTUNITY (upside events)
    "CDF Disbursement"
      Flavour: "Your MP announced CDF funds for small businesses. You qualify."
      A. Apply now — receive K500 grant, spend 1 hour on paperwork (miss 20% morning customers)
      B. Skip paperwork — keep full customer flow, lose the K500

    "Bulk Order Inquiry"
      Flavour: "A caterer wants to buy 30 units upfront for a weekend wedding."
      A. Accept at standard price — guaranteed revenue, big inventory depletion
      B. Negotiate for 10% premium — they might walk but better margin
      C. Decline — no disruption, keep stock for regular customers

    "Payday Weekend"
      Flavour: "Government workers just got paid. Spending is up across Kabwata."
      Automatic: customer_multiplier x1.5 today — no choice needed
      Display: newspaper announces it in the morning so player can plan

  RISK & CONSEQUENCE (teaching moments)
    "The Health Inspector"
      Flavour: "A City Council health inspector visits your food stall."
      If hygiene upgrade purchased: automatic pass, no consequence
      If not: A. Pay K200 "informal fee" to pass | B. Fail — lose 2 days trading

    "Fire at the Market"
      Flavour: "A stall two rows away caught fire. The market closes for 3 hours."
      Immediate: lose 40% of today's customers
      If you have fire insurance upgrade: receive K1,000 compensation
      Teaches: insurance value

    "A Customer Complaint"
      Flavour: "A customer is threatening to post on Facebook that your
                products are fake."
      A. Refund — K{price} loss, reputation preserved, they might stay loyal
      B. Replace product — small inventory cost, strong reputation signal
      C. Ignore — 20% chance reputation drops 15 points

### Event Scheduling
  Days 1-7:   Max 1 event per day, mostly positive or neutral
  Days 8-15:  Max 1 event per day, higher probability of risk events
  Days 16-22: Max 2 events on some days, more complex choices
  Days 23-30: Max 2 events per day, debt pressure events increase
  Certain events are guaranteed: Day 1 rival appears, Day 15 debt reminder,
  Day 29 final warning about outstanding debt

---

## PART 7 — PLAYER STATS SYSTEM

### The Chilulu (Charisma) Stat
  Starts at 30/100 for all players
  Increases by:
    +3 every successful customer sale negotiation
    +2 every fair supplier deal (not below 70% of standard price)
    +5 every family event where player pays (shows community spirit)
    +1 every day the reputation score stays above 60
  Decreases by:
    -5 every customer who walks away from a bad deal
    -3 every rejected family request
    -2 every day without any social interaction (no chat, no negotiation)

  Chilulu Effects (unlocked at thresholds):
    40+: Customers occasionally start conversations first
    55+: Bulk buyer discount available without negotiating
    70+: Maximum selling price ceiling increases 10%
    85+: Rival Mulenga occasionally sends respectful messages
    95+: "Market Legend" status — all customers give 5% loyalty premium

### Business Reputation Score
  Starts at 50/100
  Increases:
    +5 each profitable day
    +3 each completed customer chat with a sale
    +10 each mission completed
    -5 each day at a loss
    -8 each customer complaint unresolved
    -15 if business fails (cash = K0)

  Reputation Effects:
    70+: Regular customers return daily (+3 base customers)
    80+: Premium product unlocked at higher price ceiling
    90+: News mention ("Best stall in Kabwata" — boosts day's customers 25%)

### Supplier Relationship
  Starts at 0
  +1 each day with fair purchase (price paid ≥ standard COGS)
  +2 each day order is 15+ units
  -3 each day with lowball negotiation below 65% standard price
  -5 if no purchase for 2+ days

  Relationship Effects:
    5+: Supplier remembers your name, slightly friendlier tone
    10+: "Trusted Customer" status — automatic 8% discount no haggling needed
    15+: Loyalty pricing — COGS drops 12% permanently for this run
    -5 or below: Supplier delays delivery by 1 day (stock arrives next morning)

---

## PART 8 — SHOP UPGRADE TREE

Upgrades are purchased from the game menu at any time using cash.
They persist for the entire run. Each upgrade teaches a financial concept.

  TIER 1 (available from Day 3)
    Better Signage        — K300  — +8% foot traffic permanently
                                    Teaches: marketing as investment
    Stock Logbook         — K150  — reduces spoilage/mortality by 50%
                                    Teaches: record-keeping value
    Separate Business Wallet — K0 — forces cash split (free unlock, strongly recommended)
                                    Teaches: business/personal separation

  TIER 2 (available from Day 7, after one phase unlock)
    Generator             — K800  — immune to load shedding customer loss
                                    Teaches: infrastructure as insurance
    Delivery Partnership  — K400  — access to 2 suppliers, reduces supplier delay risk
                                    Teaches: supply chain diversification
    Customer Loyalty Book — K250  — track loyal customers, +5 guaranteed daily customers
                                    Teaches: CRM and retention economics

  TIER 3 (available from Day 15, Phase 2 required)
    Extra Staff           — K200/day ongoing — handles +15 more customers/day
                                    Teaches: labour economics, operating leverage
    Cold Storage          — K1,200 one-time — unlocks cold drink/perishable line
                                    Teaches: product diversification, CapEx
    Fire Insurance        — K100/day — pays K1,000 if fire/disaster event fires
                                    Teaches: insurance ROI, risk management

  TIER 4 (available from Day 20, Phase 3 required)
    Second Stall Location — K2,000 — opens satellite location, double customer base
                                    Teaches: expansion capital, multi-location ops
    Social Media Account  — K500   — viral event probability increases 3x
                                    Teaches: digital marketing ROI
    Business Bank Account — K0 free — unlocks formal credit history building
                                    (required for DBZ/ZANACO loan applications)

---

## PART 9 — THE PATIENCE METER (Supplier Negotiation)

Visual: A horizontal bar (red-amber-green) visible during all negotiation.
Starts at 100%. Every player message drops it by 10-25 depending on aggression.

Patience drop rules:
  Offer below 70% of standard price:   -25 patience
  Offer 70-79% of standard price:      -15 patience
  Offer 80-89% of standard price:      -8 patience
  Offer 90%+ of standard price:        -3 patience
  Respectful message without low offer: -2 patience
  Applying a Bulk Buyer token:          +10 patience, guaranteed deal

If patience hits 0:
  Supplier ends conversation: "I don't have time for this."
  COGS increases 10% for today only (penalty — they find you difficult)
  No negotiation possible today

Leverage Tokens:
  Earned by: ordering 20+ units on any single day
  Stored: visible in the negotiation panel as coin icons (max 3 stored)
  Used by: clicking "Use Token" button during negotiation
  Effect: supplier immediately offers 15% discount, patience resets to 50%
  Teaches: that reliability earns leverage

---

## PART 10 — AUDIO DESIGN (Tone.js)

Use Tone.js to synthesise ALL audio procedurally. No external audio files.
Create a singleton GameAudio module imported into BizSimPage.

Audio Events and Tone.js implementation:

  SALE KA-CHING:
    Tone.js Synth, attack 0.001, decay 0.1, sustain 0, release 0.1
    Notes: C5, E5 played in rapid succession (16ms apart)
    Pitch scales with sale amount: small sale = lower register, big sale = higher
    Play for each customer served during day animation (staggered 80ms apart)

  CUSTOMER WALKS AWAY (buzzer):
    Tone.js NoiseSynth or low FMSynth
    Short 200ms descending tone: F3 → D3
    Plays when price_factor causes walkaway during day animation

  DAY START (market ambience):
    Tone.js PolySynth, low-volume chord
    Random warm chord: Cmaj7 or Fmaj9 (optimistic feel)
    Fades in over 1 second as doors open

  DAY PROFITABLE (success):
    Rising chord: C4 → E4 → G4 → C5 in quick succession (120bpm)
    Warm synth pad holds for 1.5 seconds

  DAY LOSS (failure):
    Descending minor: G4 → F4 → D4 → B3
    Slight reverb on the last note
    Should feel "ominous" not cruel

  DEBT WARNING (urgent):
    Repeated pulsing tone: D4 × 3 at 0.3s intervals
    Only plays when debt is due in ≤ 5 days

  UPGRADE PURCHASED:
    Ascending 4-note run + sparkle (high-register C6 E6)
    Satisfying, reward-brain activation

  RIVAL APPEARS (NPC message):
    Short "notification" — two-tone C5/G5 chime

  MISSION COMPLETE:
    Full 4-note fanfare: C4 E4 G4 C5, each 200ms, reverb tail
    The most satisfying sound in the entire game — reserved for missions

  GAME OVER (bankruptcy):
    Slow minor arpeggio descending, fade to silence
    Should feel heavy, not comic

All Tone.js instances must be created once and reused. Do NOT create new
Synth instances on every sound call — create them at GameAudio mount and
call .triggerAttackRelease() on each call.

---

## PART 11 — THE LUSAKA TIMES (Morning Newspaper)

A newspaper front page renders before each day's decisions.

### Visual Design
  Header: "THE LUSAKA TIMES" in serif font, gold/navy colour
  Date: "Day {N} — {fictional date in current year}"
  Headline: large text, 24-28px, bold
  Sub-headline: smaller supporting text
  Market column: right sidebar with 3 bullet "market tips"
  Rival column: "Competitor Watch" showing Mulenga's moves (fictional but data-driven)

### Content Types

  ECONOMIC NEWS (macro)
    Tied to actual macro events in the game:
    "BOZ holds interest rates steady — borrowing costs unchanged for SMEs"
    "Kwacha strengthens against dollar — imported goods 5% cheaper"
    "Copper prices at 6-month high — Copperbelt consumer spending up"
    "Fuel price review scheduled — transport costs may rise"

  MARKET INTELLIGENCE (direct hints)
    "Weekend forecast: Heavy rains expected Saturday-Sunday. Plan accordingly."
    "Kamwala market report: High footfall expected mid-week payday spending"
    "Supplier update: Mealie meal supplies tight — consider stocking up today"
    These directly reference what is about to happen in the next 1-3 days

  RUMOURS (may be false — teaches media literacy)
    "Sources say new competitor opening on Cairo Road next week"
    "Word on the street: demand for phone accessories falling after new model"
    "Industry insider: CEEC releasing emergency SME grants tomorrow"
    Some of these are accurate (30%), some are false (70%) — teaches critical thinking

  RIVAL WATCH (Mulenga/equivalent column)
    "Mulenga's Kiosk (Kabwata): Estimated sales yesterday — K{rival_yesterday}"
    "Spotted: Mulenga loading large quantities of stock. Stocking up for the week?"
    "Market sources: Mulenga cut prices by 10% this morning — reason unknown"

### Newspaper Display Mechanics
  CSS animation: newspaper slides down from top, like being dropped on a table
  Sound: paper rustle (Tone.js NoiseSynth, 200ms)
  Player reads it, then clicks "Start the Day" button in the bottom right
  Reading is optional — player can skip — but the information is valuable
  Newspaper is available to re-read from the day's decision screen

---

## PART 12 — FINANCIAL STATEMENTS (Educational Core)

The statements tab must be the clearest, most educational screen in the game.
Every number must link back to a specific decision the player made.

### P&L Statement (Income Statement)
  Revenue:                    K{total_revenue}
  Cost of Goods Sold (COGS):  K{total_cogs}     [link: "This is what you paid per unit × units sold"]
  GROSS PROFIT:               K{gross_profit}    [highlight: "Your margin before running costs"]
  Gross Margin %:             {margin}%          [colour-coded: red if <20%, amber 20-35%, green 35%+]
  ─────────────────────────────────
  Marketing spend:            K{marketing}
  Fixed costs (rent/staff):   K{fixed}
  Loan interest:              K{interest}        [link: "This is why Kaloba loans destroy businesses"]
  Upgrade costs:              K{upgrades}
  Family contributions:       K{family}
  ─────────────────────────────────
  NET PROFIT:                 K{net_profit}      [large, colour-coded]
  Net Margin %:               {net_margin}%

### Balance Sheet
  ASSETS
    Cash on hand:             K{cash}
    Inventory value:          K{inventory_value}
    Total Assets:             K{total_assets}
  ─────────────────────────────────
  LIABILITIES
    Debt outstanding:         K{debt_balance}
    Loan balance:             K{loan_balance}
    Total Liabilities:        K{total_liabilities}
  ─────────────────────────────────
  NET EQUITY:                 K{equity}
  [Note: Must always show Assets = Liabilities + Equity. If not, flag as error.]

### Cash Flow Chart
  Recharts AreaChart showing daily cash position over the run
  Reference line at K0 (solvency threshold)
  Reference line at debt amount (visual of what you owe)
  Colour fill: green above K0, red below

### The Debt Tracker
  Only visible when player has active debt
  Outstanding: K{debt_balance}
  Daily interest: K{daily_interest}
  Days remaining: {days_left}
  Interest paid so far: K{interest_paid}
  If Kaloba debt at 60% p.a.: show a warning banner:
    "⚠ At 60% p.a., you are paying K{daily_interest}/day just in interest.
     Every day you don't repay this loan costs you K{daily_interest}."
  This is the "hidden interest trap" teaching moment.

---

## PART 13 — THE FINAL REPORT CARD (Day 30)

Full-screen reveal with celebration animation if debt is paid,
somber presentation if debt remains unpaid.

### Report Card Structure

  HEADER: "30-Day Business Review — {business_name}"

  FINANCIAL SUMMARY
    Total Revenue:           K{total_revenue}
    Total Profit:            K{total_profit}
    Final Cash Position:     K{cash}
    Debt Status:             PAID / K{remaining} REMAINING / DEFAULT
    Peak Cash Day:           Day {day}, K{amount}
    Worst Day:               Day {day}, K{loss} loss

  BUSINESS HEALTH SCORES (0-100)
    Pricing Discipline:      {score}  [were margins healthy?]
    Cash Flow Management:    {score}  [how often was cash near zero?]
    Savings Discipline:      {score}  [regular saving habit?]
    Risk Management:         {score}  [survived events well?]
    Financial Literacy Score:{score}  [composite — feeds into KIP Learn]

  BEST DECISION OF THE RUN
    Claude AI identifies the single best decision: "Day 14: You bought the
    generator upgrade. It saved you K800 in customer losses during 3 load
    shedding events."

  WORST DECISION OF THE RUN
    Claude AI identifies the worst: "Day 3: Pricing at K65 when your COGS
    was K75. You lost K10 on every unit sold for 2 days straight."

  RIVAL COMPARISON
    Your profit vs Mulenga's profit — bar chart comparison
    If you won: Mulenga sends a concession message
    If you lost: Mulenga gloats (but the stats show where you went wrong)

  WHAT YOU LEARNED (3 personalised lessons from Claude)
    Based on actual game data, not generic:
    "You priced below cost on 4 days. Raising price 15% with fewer
     customers would have earned you K340 more."
    "Your Chilulu score of 72 earned you automatic bulk discounts —
     keep negotiating fairly."
    "You paid K1,400 in Kaloba interest. The same K1,400 would have
     funded the generator upgrade that saved K800."

  GHOST RUN
    If this is not the player's first run:
    "You improved by K{improvement} on your previous best."
    "You beat your ghost on {N} days."

  CTA
    [Play Again — Beat Your Score]
    [Try a Different Business]
    [Take the KIP Learn Financial Literacy Course]
    [Ask KIP for Business Advice]

---

## PART 14 — LEADERBOARD

Live leaderboard of all active KIP BizSim players (real users).

Columns: Rank | Business Name | Type | Owner | Net Profit | Day | Phase

  - Rival (Mulenga/equivalent) is always visible in the leaderboard,
    even if their profit would rank them off the top 20 — they appear
    highlighted in a different colour ("Your Rival")
  - Player's own row is highlighted in blue
  - Update on every day submission
  - "Today's Top Performer" banner showing the #1 player for today

---

## PART 15 — MISSIONS SYSTEM

5 core missions per run + 3 bonus missions:

  Core:
    First Profit      — Make profit on any single day                    Reward: K200
    Double Capital    — Grow cash to 2× starting capital                 Reward: K500
    100 Customers     — Serve 100 cumulative customers                   Reward: K300
    5-Day Streak      — Profitable 5 consecutive days                    Reward: K400
    Debt Freedom      — Fully repay starting debt before Day 30          Reward: K1,000

  Bonus:
    Upgrade Pioneer   — Purchase any 3 shop upgrades                     Reward: K250
    Shock Survivor    — Stay profitable through a major event            Reward: K600
    Chilulu Master    — Reach Chilulu score 70+                         Reward: K350

  Mission rewards are cash injected immediately on completion.
  A mission completion triggers:
    - Full-screen flash of the mission card with reward amount
    - Fanfare audio (the most satisfying sound in the game)
    - Floating "+K{reward}" animation

---

## PART 16 — UI/UX SPECIFICATIONS

### Colour System (inherits KIP light theme)
  Primary actions:     var(--blue-500) #1A6CF0
  Money/profit:        var(--green-500) #16A34A
  Loss/warning:        var(--red-500) #DC2626
  Gold/opportunity:    var(--gold-500) #C8763A
  Debt indicator:      #7C3AED (purple — signals danger without red)
  Rival colour:        #EF4444 with dashed border

### Typography (inherits KIP design system)
  Game title / Day header:    Syne, 28-36px, weight 800
  Stats/numbers:              Syne, tabular-nums, weight 700
  Event card text:            Plus Jakarta Sans, 15px, weight 500
  Newspaper:                  Georgia or similar serif, for authenticity
  Rival dialogue:             Italic, slightly smaller, distinct bubble

### Card Animations
  Event card entry:    translateY(100%) → translateY(0), 350ms ease-out-expo
  Day result entry:    opacity 0 → 1 + translateY(20px) → 0, 400ms ease-out-expo
  Number animations:   useCounter hook (already built in KIP codebase)
  Mission flash:       scale(0.8) + opacity 0 → scale(1) + opacity 1, 500ms

### Mobile-First Requirements
  All game screens must work on 375px viewport minimum
  Canvas day animation scales to viewport width
  Touch targets: 44px minimum
  Bottom navigation preserved from existing KIP Layout

---

## PART 17 — BACKEND API ENDPOINTS REQUIRED

New endpoints (add to bizsim_routes.py):

  POST /api/bizsim/start              — enhanced with story_id, debt setup, rival creation
  POST /api/bizsim/day/run            — enhanced with event resolution, rival simulation
  POST /api/bizsim/event/choose       — record event card choice and apply consequences
  POST /api/bizsim/upgrade/purchase   — buy a shop upgrade
  GET  /api/bizsim/session            — full session state including new fields
  GET  /api/bizsim/statements         — P&L, balance sheet, cash flow chart data
  GET  /api/bizsim/newspaper/{day}    — morning newspaper content for current day
  GET  /api/bizsim/missions           — mission list + completion status
  GET  /api/bizsim/leaderboard        — live leaderboard with rival highlighted
  POST /api/bizsim/negotiate          — supplier negotiation (already exists, extend with patience)
  POST /api/bizsim/customer-chat      — customer chat (already exists, extend with Chilulu)
  POST /api/bizsim/loan/apply         — AI loan officer (already exists)
  POST /api/bizsim/loan/repay         — repay debt (already exists)
  GET  /api/bizsim/final-report       — end game report card with Claude analysis
  POST /api/bizsim/restart            — reset session

---

## PART 18 — EDUCATIONAL OBJECTIVES (IMPLICIT LEARNING)

The game must NEVER explicitly state these objectives.
Players learn by experiencing consequences.

  Lesson 1: Cash flow ≠ Profit
    Mechanism: Player can be profitable on paper but die from K0 cash.
    Teaching moment: Day when inventory value is high but cash is K0 and supplier demands upfront payment.

  Lesson 2: Compound interest destroys businesses
    Mechanism: Kaloba debt at 60% p.a. compounds daily. Player watches equity fall on balance sheet.
    Teaching moment: Statements tab shows "Interest paid so far: K{x}" growing daily.

  Lesson 3: Pricing below cost = faster death
    Mechanism: Selling below COGS generates revenue but destroys cash.
    Teaching moment: Day animation shows full shop but results screen shows loss — confusing until player checks price vs COGS.

  Lesson 4: Diversification reduces risk
    Mechanism: Players who rely on one product/revenue stream get wiped by events.
    Teaching moment: Supplier strike event hits single-product players hardest.

  Lesson 5: Insurance is worth it
    Mechanism: Fire event fires — players without insurance lose 2 days trading.
    Teaching moment: After the event, the upgrade screen shows "Fire Insurance: K100/day. Your loss today: K{revenue × 2}."

  Lesson 6: Saving before spending
    Mechanism: Save slider is visible every day. Players who never save have K0 reserves when events hit.
    Teaching moment: After any shock event, "Cash Reserve" stat shows K0 vs what others saved.

  Lesson 7: Community capital
    Mechanism: Chilulu stat affects business outcomes. Being liked = tangible business advantage.
    Teaching moment: Chilulu 70+ unlocks automatic bulk discounts — player sees the financial value of being liked.

---

## IMPLEMENTATION ORDER (Priority)

Sprint Game-1 (2 days): Story + Events + Day Animation
  1. StorySetup.jsx with all 6 business stories and rival introductions
  2. EventCard.jsx with all 30 event definitions
  3. DayCanvas.jsx with customer dot animation
  4. GameAudio.jsx with Tone.js ka-ching and ambience
  5. Backend: extend start endpoint with debt/story fields
  6. Backend: event logging and consequence application

Sprint Game-2 (2 days): Stats + Systems
  7. Patience meter in NegotiationChat.jsx
  8. Chilulu stat display and backend tracking
  9. ShopUpgrades.jsx with all 4 tiers
  10. LusakaNewspaper.jsx with procedural content
  11. Break-even counter in DecisionPanel.jsx
  12. Rival NPC messages at key days

Sprint Game-3 (1 day): Polish + Report
  13. FinalReport.jsx with Claude AI analysis
  14. Ghost run system
  15. FinancialStatements.jsx enhanced with debt tracker and annotations
  16. Leaderboard with rival highlight
  17. Mission completion full-screen animation

---

## DEFINITION OF DONE

The game is complete when:
  ✓ A player who has never studied financial literacy can play through
    30 days and, at the end, correctly explain what "gross margin" means
    without it ever being defined in the game.

  ✓ A player who loses on Day 20 starts a new game within 60 seconds.

  ✓ A ZICTA judge who opens BizSim says "this feels like a real product"
    within the first 30 seconds of playing.

  ✓ The double-entry ledger always balances. Assets = Liabilities + Equity
    after every transaction without exception.

  ✓ The game works completely offline after the first load. Daily AI
    coaching is the only feature requiring connectivity.
