"""
KIP Knowledge Base — Initial Content
These are the foundational knowledge texts that are ingested into
ChromaDB on first setup. They cover core economics, finance, and
business principles relevant to KIP's function.

This is the "undergraduate curriculum" — the foundation.
More documents are added via the ingestion pipeline over time.
"""

INITIAL_KNOWLEDGE_TEXTS = [

{
"id": "econ_basics_01",
"category": "economics",
"subcategory": "microeconomics",
"title": "Supply, Demand and Market Equilibrium",
"content": """
Supply and demand is the fundamental model of how prices are determined in markets.
Demand refers to the quantity of a good or service that consumers are willing and
able to purchase at various prices. The law of demand states that as price increases,
quantity demanded decreases — consumers buy less when things cost more.

Supply refers to the quantity a producer is willing to offer at various prices.
The law of supply states that as price increases, quantity supplied increases —
producers make more when prices are higher.

Market equilibrium occurs where supply equals demand — the price at which the
market clears with no shortage or surplus. In Zambian markets, this equilibrium
can be affected by currency fluctuations (affecting imported goods costs),
seasonal agricultural supply, and informal sector pricing.

Price elasticity measures how sensitive demand is to price changes. Essential
goods (food, transport) tend to be inelastic — people buy them regardless of
price. Luxury goods are elastic — people reduce purchases significantly when
prices rise. For SME pricing strategy in Zambia, understanding whether your
product is essential or discretionary determines your pricing power.

Market structures range from perfect competition (many sellers, identical products,
no pricing power — like maize meal in Zambia) to monopoly (one seller, full pricing
power). Most Zambian SMEs operate in monopolistic competition — many sellers but
differentiated products, giving some pricing power.
""",
"zambia_relevance": "high"
},

{
"id": "econ_basics_02",
"category": "economics",
"subcategory": "macroeconomics",
"title": "Inflation, Purchasing Power and Zambian Context",
"content": """
Inflation is the rate at which the general price level rises, reducing the
purchasing power of money. If inflation is 15%, K1,000 today buys what K870
bought a year ago. For entrepreneurs, inflation affects both costs and revenue.

In Zambia, inflation is primarily driven by:
1. Food prices — maize meal, cooking oil, and vegetables are major drivers
2. Fuel prices — affect transport costs throughout the supply chain
3. ZMW/USD exchange rate — Zambia imports many goods, so a weaker kwacha
   directly increases the cost of imported products
4. Money supply — Bank of Zambia monetary policy

The impact of inflation on SMEs in Zambia:
- Input costs rise, squeezing profit margins if prices are not adjusted
- Customers have less real purchasing power — demand for non-essentials falls
- Businesses holding inventory benefit from rising prices
- Businesses with fixed-price contracts lose when costs rise

Inflation protection strategies for Zambian SMEs:
- Price products regularly — monthly review is minimum when inflation is high
- Hold physical inventory rather than cash during high inflation periods
- Source locally where possible to reduce USD exchange rate exposure
- Build a loyal customer base willing to accept price adjustments

The Bank of Zambia targets inflation and uses interest rates as its primary tool.
When inflation is high, BoZ raises interest rates, making borrowing more expensive.
This is why loan costs in Zambia tend to be high — a direct consequence of
inflation management policy.
""",
"zambia_relevance": "very_high"
},

{
"id": "finance_basics_01",
"category": "finance",
"subcategory": "financial_mathematics",
"title": "Time Value of Money and Business Applications",
"content": """
The time value of money is the principle that money available now is worth
more than the same amount in the future, because it can be invested and earn returns.

Key concepts:
- Present Value (PV): What a future amount is worth today
- Future Value (FV): What an amount today will be worth in future
- Net Present Value (NPV): The present value of all future cash flows minus
  the initial investment — the primary tool for evaluating business opportunities

Formula: PV = FV / (1 + r)^n
Where r = interest rate and n = number of periods

Break-even Analysis for Zambian SMEs:
Break-even point = Fixed Costs / (Price per unit - Variable cost per unit)

Example: A phone repair shop in Kitwe
- Monthly rent: K1,200
- Monthly utilities and supplies: K400
- Monthly total fixed costs: K1,600
- Average revenue per repair: K150
- Average parts cost per repair: K60
- Contribution margin per repair: K90
- Break-even: K1,600 / K90 = 18 repairs per month

This means 18 repairs just to break even. Every repair above 18 is profit.
With 4-5 repairs per day (realistic for a skilled technician), monthly
revenue would be approximately K3,000-K4,500 for net profit of K1,400-K2,900.

Loan amortisation: Understanding how business loans work is critical for
Zambian entrepreneurs. A K10,000 CEEC loan at 8% interest over 12 months
costs approximately K867/month in repayments. This must be factored into
cash flow projections from day one.
""",
"zambia_relevance": "high"
},

{
"id": "finance_basics_02",
"category": "finance",
"subcategory": "business_finance",
"title": "Reading Financial Statements — Simplified for SMEs",
"content": """
Financial statements are the language of business. Even micro-entrepreneurs
benefit from understanding three core documents:

1. PROFIT AND LOSS STATEMENT (Income Statement)
   Shows revenue, costs, and profit over a period.
   Revenue - Cost of Goods Sold = Gross Profit
   Gross Profit - Operating Expenses = Net Profit

   Example for a Lusaka tailoring business (monthly):
   Revenue: K4,500 (15 outfits at K300 average)
   Fabric and materials: K1,800 (40% of revenue)
   Gross Profit: K2,700
   Rent: K900 | Transport: K200 | Phone: K100
   Net Profit: K1,500 (33% net margin — healthy for a service business)

2. CASH FLOW STATEMENT
   More important than profit for SMEs. Profitable businesses fail because
   they run out of cash. Common in Zambia when customers pay late.
   Cash flow = Cash received - Cash paid out in the period
   Always maintain a cash reserve of 1-2 months operating costs.

3. SIMPLE BALANCE SHEET
   Assets (what you own) = Liabilities (what you owe) + Owner's Equity
   For micro-businesses: Track stock value, equipment, cash (assets)
   and any loans or supplier credit (liabilities).

Key financial ratios for Zambian SMEs:
- Gross Profit Margin: Gross Profit / Revenue × 100
  Target: 30-60% for products, 50-80% for services
- Net Profit Margin: Net Profit / Revenue × 100
  Target: 10-25% sustainable business
- Stock Turnover: How many times stock is sold in a period
  Target: Depends on sector. Food: 12-52x per year. Electronics: 3-6x per year.
""",
"zambia_relevance": "very_high"
},

{
"id": "business_basics_01",
"category": "business",
"subcategory": "entrepreneurship",
"title": "Business Model Design — The Building Blocks",
"content": """
A business model answers the fundamental questions: Who are your customers?
What value do you provide? How do you deliver it? How do you make money?

The Business Model Canvas (Alexander Osterwalder) identifies 9 components:
1. Customer Segments — who exactly pays you
2. Value Proposition — what problem you solve or benefit you provide
3. Channels — how customers access your product/service
4. Customer Relationships — how you maintain customer loyalty
5. Revenue Streams — how you earn money (and how much per transaction)
6. Key Resources — what you need to operate (people, equipment, knowledge)
7. Key Activities — what you actually do every day
8. Key Partnerships — who you work with (suppliers, distributors)
9. Cost Structure — what you spend money on

Revenue model types relevant for Zambian SMEs:
- PRODUCT SALES: Buy low, sell high. Most common. Margins depend on
  competition and supplier relationships.
- SERVICE FEES: Charge for your time/skills. High margin, low capital.
  Phone repair, tailoring, accounting, tutoring.
- COMMISSION/AGENT: Earn a percentage for connecting buyers and sellers.
  Real estate, insurance, FMCG distribution.
- SUBSCRIPTION: Recurring payment for ongoing service. Less common in
  Zambia but growing with digital services.
- ASSET UTILISATION: Earn from renting assets. Chairs at market stall,
  equipment rental, room rental.

Market entry strategy for Zambian SMEs:
1. Start with a specific niche — be the best at one thing in one area
2. Build a loyal customer base before expanding
3. Reinvest profits, not take them all out initially
4. Understand your customer better than anyone else does
""",
"zambia_relevance": "very_high"
},

{
"id": "business_basics_02",
"category": "business",
"subcategory": "marketing",
"title": "Marketing for Zambian SMEs — Practical Approaches",
"content": """
Marketing is how potential customers find out you exist and choose you over
alternatives. For Zambian SMEs with limited budgets, the most effective
approaches are:

1. WORD OF MOUTH — Still the most powerful in Zambian communities.
   Every satisfied customer becomes a marketing channel. Deliver quality,
   treat people well, and ask satisfied customers to tell others.
   Strategy: Give 10% discount to customers who bring a new customer.

2. FACEBOOK/SOCIAL MEDIA — Zambia has ~6 million Facebook users.
   Free to use. Effective for visual products (food, clothing, products).
   Strategy: Post photos of your work daily. Respond to comments quickly.
   Join local neighbourhood Facebook groups and participate genuinely.

3. LOCATION/SIGNAGE — Physical visibility matters enormously in Zambia's
   walking-heavy culture. A clear, professional sign pays for itself quickly.
   Strategy: Bright colours, clear business name, what you sell/do.

4. COMMUNITY PRESENCE — Church networks, market associations, resident
   associations, school parent groups. These are trusted referral networks.

5. MOBILE MONEY PROMOTION — Accept MTN MoMo and Airtel Money.
   This is increasingly expected and removes a purchase barrier.

The 4Ps of Marketing in Zambian Context:
- PRODUCT: Localise — what works in Lusaka may not work in Kasama
- PRICE: Zambian consumers are price-sensitive; communicate value clearly
- PLACE: Location is crucial — foot traffic vs delivery vs market stall
- PROMOTION: Community and social media first; expensive advertising later

Pricing psychology in Zambia:
- K99 feels significantly cheaper than K100 (effective)
- Bundle pricing works (3 for K250 instead of K90 each)
- "First purchase" discounts build customer acquisition
- Credit/layby builds loyalty but requires cash flow management
""",
"zambia_relevance": "very_high"
},

{
"id": "zambia_econ_01",
"category": "zambia",
"subcategory": "economic_structure",
"title": "Zambia's Economic Structure and SME Landscape",
"content": """
Zambia's economic structure as of 2024:
- GDP: Approximately USD 27-30 billion (medium-income by African standards)
- Primary driver: Copper mining (~70% of export earnings)
- Currency: Zambian Kwacha (ZMW) — historically volatile against USD
- Inflation: Has ranged 10-25% in recent years; food and fuel are key drivers
- Formal employment: Only ~15% of working population in formal sector
- Informal sector: ~85% of working Zambians — the primary target for KIP

The informal economy in Zambia is not a failure of development —
it is the dominant economic reality. Successful entrepreneurs understand
how it works:
- Transactions are predominantly cash-based (mobile money is growing)
- Trust and reputation are the primary business assets
- Supply chains are often informal and relationship-based
- Regulation is light in practice even when it exists in theory
- Community networks are more powerful than advertising

SME challenges in Zambia:
- Access to capital: Most banks require collateral that SMEs don't have
- Market information: Limited data on what businesses succeed where
- Regulatory complexity: PACRA, ZRA, local authority requirements
- Infrastructure: Power outages, road conditions affect operations
- Competition from imports: Cheap Chinese goods compete with local production

SME opportunities in Zambia:
- Large young population creates demand for youth-oriented services
- Growing middle class in urban areas demands quality goods and services
- Mobile phone penetration creates new business model possibilities
- Regional trade: Zambia borders 8 countries — cross-border trade opportunities
- Agricultural value addition: Zambia produces raw materials, processes little
- Tourism: Growing sector especially around Victoria Falls and national parks
""",
"zambia_relevance": "very_high"
},

{
"id": "zambia_finance_01",
"category": "zambia",
"subcategory": "financing",
"title": "SME Financing Landscape in Zambia",
"content": """
Access to capital is the primary constraint for Zambian SMEs. Here is the
complete landscape of available financing options:

GOVERNMENT PROGRAMMES:
1. CEEC (Citizens Economic Empowerment Commission)
   - Focus: Zambian citizens, especially women and youth
   - Loan range: K5,000 to K500,000
   - Interest rate: Below commercial rates (around 8-15%)
   - Requirements: Business plan, NRC, proof of concept
   - How to apply: Visit CEEC provincial office or ceec.org.zm
   - Time to funds: 4-12 weeks typically

2. CDF (Constituency Development Fund)
   - Focus: Community projects and small businesses in the constituency
   - Amount: Varies by constituency; K5,000-K50,000 for small businesses
   - Interest: Often zero-interest grant component
   - How to apply: Through your local ward councillor or MP office
   - Tip: Social enterprises and community-benefit businesses favoured

3. DBZ (Development Bank of Zambia)
   - Focus: Larger SME investments, agriculture, manufacturing
   - Loan range: K20,000 and above
   - Requirement: Business plan, financial projections, security
   - Better for established businesses seeking growth capital

COMMERCIAL BANKS (higher rates, more accessible for established businesses):
- ZANACO: SME products, mobile banking strong
- FNB Zambia: SME loans, good branch network in Copperbelt
- Stanbic, Standard Chartered, Absa: More for medium enterprises

MICROFINANCE (accessible but expensive):
- FINCA Zambia: Group lending, individual loans K500-K20,000
- Bayport Financial Services: Quick personal/business loans
- Madison Finance: Short-term loans
- Note: Interest rates are high (40-80% per annum). Use only for short-term needs.

INFORMAL MECHANISMS:
- VSLA (Village Savings and Loan Associations): Community groups where
  members save together and can borrow 2-3x their savings. Common in
  peri-urban and rural areas. Zero external oversight — trust-based.
- Chama (Rotating savings): Group of friends pool money, each member
  gets the full pool on rotation. No interest. Good for lumpy capital needs.

AGRICULTURAL SPECIFIC:
- ZNFU (Zambia National Farmers Union): Programs for agri-SMEs
- Contract farming: Zambeef, Zambia Sugar offer input credit to outgrowers
""",
"zambia_relevance": "very_high"
},

{
"id": "development_econ_01",
"category": "economics",
"subcategory": "development",
"title": "Development Economics and African Markets",
"content": """
Development economics studies how economies in lower-income countries grow
and how to accelerate that process. Key concepts relevant to Zambian entrepreneurs:

COMPARATIVE ADVANTAGE: Countries and regions produce what they are relatively
better at producing. Zambia's comparative advantages include: copper mining,
agriculture (good land and rainfall), tourism (natural wonders), and increasingly,
services. Entrepreneurs should align with these advantages where possible.

THE POVERTY TRAP: People without capital cannot invest; without investment,
cannot earn returns; without returns, cannot accumulate capital. CEEC, CDF, and
microfinance programs exist precisely to break this cycle. KIP's financing guidance
helps entrepreneurs escape the trap.

DUAL ECONOMY: Most developing countries, including Zambia, have a dual economy:
a modern formal sector and a traditional informal sector. Successful SMEs often
bridge these two worlds — operating informally but serving formal-sector customers,
or formalising to access formal-sector opportunities (government contracts, bank loans).

MARKET FAILURES in African contexts:
- Information asymmetry: Sellers know more than buyers (quality uncertainty)
- Missing markets: Financial services, insurance not available to all
- Public goods: Roads, electricity often unreliable
These failures create business opportunities for those who solve them.

NETWORK EFFECTS in African markets: Community networks (church, tribe, region)
drive economic transactions more than formal mechanisms. Trust is currency.
Reputation spreads rapidly through these networks — both positive and negative.

LEAPFROGGING: African markets skip technologies. Zambia largely skipped
landlines and went directly to mobile. Mobile money (MoMo) is more common
than traditional banking for many. Entrepreneurs who leverage these leapfrogged
technologies gain significant advantages.
""",
"zambia_relevance": "high"
},

]
