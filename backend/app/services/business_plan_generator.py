"""
KIP Business Plan Generator — Sprint 7
Generates a professional, bankable business plan PDF using:
- Claude API for intelligent content generation
- ReportLab for professional PDF formatting with KIP branding

Output: PDF suitable for submitting to banks, CDF, CEEC, DBZ.
"""

import os
import json
import io
import base64
from datetime import datetime
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.platypus import Flowable

# ── Colours ──────────────────────────────────────────────────────────────────
NAVY   = HexColor('#040C18')
BLUE   = HexColor('#1B6EF3')
LIGHT  = HexColor('#4B9EFF')
TEAL   = HexColor('#00D4B1')
GOLD   = HexColor('#F5A623')
GREEN  = HexColor('#00E676')
DARK   = HexColor('#0D2040')
MUTED  = HexColor('#7B9ABB')
BODY   = HexColor('#1A2B3C')
WHITE  = HexColor('#FFFFFF')
LGRAY  = HexColor('#F0F4F8')
MGRAY  = HexColor('#CBD5E0')
DGRAY  = HexColor('#4A5568')

W, H = A4


def _logo_data() -> Optional[bytes]:
    for path in ['/home/claude/kip_logo_v2.png', '/home/claude/kip_logo.png']:
        if os.path.exists(path):
            with open(path, 'rb') as f:
                return f.read()
    return None


# ── Page decorators ───────────────────────────────────────────────────────────

def _on_cover(canvas, doc):
    canvas.saveState()
    # Full navy background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Blue left bar
    canvas.setFillColor(BLUE)
    canvas.rect(0, 0, 0.55*inch, H, fill=1, stroke=0)
    # Teal accent top
    canvas.setFillColor(TEAL)
    canvas.rect(0.55*inch, H - 0.06*inch, W, 0.06*inch, fill=1, stroke=0)
    # Gold bottom bar
    canvas.setFillColor(GOLD)
    canvas.rect(0, 0, W, 0.08*inch, fill=1, stroke=0)
    canvas.restoreState()


def _on_page(canvas, doc):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, H - 0.5*inch, W, 0.5*inch, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, H - 0.52*inch, W, 0.025*inch, fill=1, stroke=0)
    # Header text
    canvas.setFillColor(white)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.drawString(0.75*inch, H - 0.32*inch, doc._title or 'KIP Business Plan')
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(W - 0.75*inch, H - 0.32*inch, 'CONFIDENTIAL  |  KWACHA INTELLIGENCE PLATFORM')
    # Footer
    canvas.setFillColor(LGRAY)
    canvas.rect(0, 0, W, 0.38*inch, fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.rect(0, 0.37*inch, W, 0.015*inch, fill=1, stroke=0)
    canvas.setFillColor(DGRAY)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(0.75*inch, 0.13*inch, f'KIP — Kwacha Intelligence Platform  |  Malovate  |  {datetime.now().strftime("%B %Y")}')
    canvas.setFillColor(BLUE)
    canvas.drawRightString(W - 0.75*inch, 0.13*inch, f'Page {doc.page}')
    canvas.restoreState()


# ── Style helpers ─────────────────────────────────────────────────────────────

def _styles():
    def s(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        'h1':    s('h1',  fontName='Helvetica-Bold',  fontSize=16, textColor=BLUE,
                   spaceBefore=18, spaceAfter=6, leading=22),
        'h2':    s('h2',  fontName='Helvetica-Bold',  fontSize=13, textColor=DARK,
                   spaceBefore=14, spaceAfter=5, leading=18,
                   borderPadding=(0,0,3,0)),
        'h3':    s('h3',  fontName='Helvetica-Bold',  fontSize=11, textColor=BODY,
                   spaceBefore=10, spaceAfter=4),
        'body':  s('bd',  fontName='Helvetica',       fontSize=10, textColor=BODY,
                   spaceAfter=6,  leading=15, alignment=TA_JUSTIFY),
        'bullet':s('bl',  fontName='Helvetica',       fontSize=10, textColor=BODY,
                   spaceAfter=3,  leading=14, leftIndent=16, bulletIndent=4,
                   bulletText='•'),
        'label': s('lbl', fontName='Helvetica-Bold',  fontSize=9,  textColor=WHITE),
        'cell':  s('cel', fontName='Helvetica',       fontSize=9,  textColor=BODY, leading=13),
        'small': s('sm',  fontName='Helvetica',       fontSize=8.5,textColor=DGRAY),
        'cover_title': s('ct', fontName='Helvetica-Bold', fontSize=28,
                         textColor=WHITE, leading=36, spaceAfter=12),
        'cover_sub':   s('cs', fontName='Helvetica',  fontSize=13,
                         textColor=MUTED, spaceAfter=8),
        'cover_label': s('cl', fontName='Helvetica-Bold', fontSize=9,
                         textColor=TEAL, charSpace=3, spaceAfter=3),
    }


def _tbl_row(label, value, st):
    return [
        Paragraph(f'<b>{label}</b>', ParagraphStyle('th', fontName='Helvetica-Bold',
                  fontSize=9, textColor=NAVY)),
        Paragraph(str(value), st['cell'])
    ]


def _section_header(title: str, color=BLUE) -> list:
    """Returns styled section header with colour underline."""
    st = _styles()
    return [
        Paragraph(title, st['h1']),
        HRFlowable(width='100%', thickness=1.5, color=color, spaceAfter=8),
    ]


def _kpi_table(rows: list, col_widths=None) -> Table:
    """Two-column KPI table with alternating row shading."""
    st = _styles()
    col_widths = col_widths or [3.5*cm, 11.5*cm]
    data = [[Paragraph(f'<b>{r[0]}</b>', ParagraphStyle('th',
             fontName='Helvetica-Bold', fontSize=9, textColor=NAVY)),
             Paragraph(str(r[1]), st['cell'])] for r in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#EEF4FF')),
        ('BACKGROUND', (1, 0), (1, -1), white),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, HexColor('#F7FAFF')]),
        ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#CBD5E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


def _financial_table(headers: list, rows: list) -> Table:
    """Styled financial projection table."""
    st = _styles()
    h_row = [Paragraph(f'<b>{h}</b>', ParagraphStyle('fh',
              fontName='Helvetica-Bold', fontSize=9, textColor=WHITE))
             for h in headers]
    d_rows = [[Paragraph(str(c), st['cell']) for c in r] for r in rows]
    col_w = [A4[0] / len(headers) - 1.5*cm] * len(headers)
    t = Table([h_row] + d_rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#EEF4FF')]),
        ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#CBD5E0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), BLUE),
    ]))
    return t


# ── AI Content Generation ─────────────────────────────────────────────────────

async def _generate_plan_content(
    business_name: str,
    owner_name: str,
    location: str,
    capital: Optional[float],
    idea_summary: str,
    survey_data: Optional[dict],
    log_summary: Optional[dict],
    projected_profit: Optional[float]
) -> dict:
    """
    Uses Claude to generate structured business plan content for each section.
    Returns a dict with keys: executive_summary, description, market_analysis,
    products_services, marketing_strategy, operations, financial_narrative,
    funding_requirements
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback_content(business_name, owner_name, location, capital)

    import anthropic

    capital_str = f"K{capital:,.0f}" if capital else "as per recommendation"
    survey_str  = json.dumps(survey_data, indent=2) if survey_data else "Not completed"
    log_str     = json.dumps(log_summary, indent=2) if log_summary else "Not yet operating"
    profit_str  = f"K{projected_profit:,.0f}/month" if projected_profit else "To be determined"

    prompt = f"""You are writing a professional, bankable business plan for a Zambian entrepreneur.
This plan will be submitted to banks, CDF (Constituency Development Fund), CEEC, or DBZ for funding.
It must be compelling, specific, and grounded in Zambian economic reality.

BUSINESS DETAILS:
- Business Name: {business_name}
- Owner: {owner_name}
- Location: {location}
- Startup Capital: {capital_str}
- Projected Monthly Profit: {profit_str}

ORIGINAL KIP RECOMMENDATION:
{idea_summary[:800] if idea_summary else 'Not available'}

MARKET SURVEY DATA (what the owner knows about the local market):
{survey_str}

ACTUAL PERFORMANCE DATA (from daily logs if available):
{log_str}

Generate a professional business plan with EXACTLY these 8 sections.
Return ONLY valid JSON — no markdown, no explanation, no preamble.

{{
  "executive_summary": "3 paragraph executive summary. Para 1: business concept and value proposition. Para 2: market opportunity with specific Zambian context. Para 3: financial highlight and funding ask.",
  "business_description": "2 paragraphs describing the business, its mission, objectives, and legal structure. Be specific about location and what the business does day-to-day.",
  "market_analysis": "3 paragraphs. Para 1: industry overview and Zambian market context. Para 2: target customer profile (use survey data if available). Para 3: competitive landscape and competitive advantage.",
  "products_services": "Detailed description of products/services offered, pricing strategy, and unique selling points. 2 paragraphs.",
  "marketing_strategy": "2 paragraphs covering: customer acquisition channels specific to this location and customer type (WhatsApp, Facebook, word-of-mouth, physical marketing), and retention strategy.",
  "operations_plan": "2 paragraphs: daily operations overview, key suppliers, staffing plan, and operational milestones for first 6 months.",
  "financial_narrative": "2 paragraphs explaining the financial projections. Reference the startup capital breakdown, monthly revenue projections, and path to profitability.",
  "funding_requirements": "2 paragraphs: what funding is being requested (if any beyond own capital), how it will be used, and repayment capability based on projected cash flows. Include relevant Zambian funding body context (CDF, CEEC, banks).",
  "startup_costs": [
    {{"item": "Equipment/Assets", "amount": "K0,000"}},
    {{"item": "Stock/Inventory", "amount": "K0,000"}},
    {{"item": "Rent (deposit + 2 months)", "amount": "K0,000"}},
    {{"item": "Staff wages (first 2 months)", "amount": "K0,000"}},
    {{"item": "Marketing & Branding", "amount": "K0,000"}},
    {{"item": "Registration (PACRA + ZRA)", "amount": "K0,000"}},
    {{"item": "Operating Reserve", "amount": "K0,000"}}
  ],
  "monthly_projections": [
    {{"month": "Month 1", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Setup and soft launch"}},
    {{"month": "Month 2", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "First clients/customers"}},
    {{"month": "Month 3", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Break-even target"}},
    {{"month": "Month 6", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Stable operations"}},
    {{"month": "Month 12","revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Growth phase"}}
  ]
}}

Fill in REAL estimated numbers based on the business type and Zambian market context.
Use ZMW (Kwacha) for all amounts. Be realistic, not optimistic."""

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        # Strip markdown fences if present
        if '```' in raw:
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
            raw = raw.split('```')[0]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"[BizPlan] AI content error: {e}")
        return _fallback_content(business_name, owner_name, location, capital)


def _fallback_content(business_name, owner_name, location, capital) -> dict:
    cap = f"K{capital:,.0f}" if capital else "startup capital"
    return {
        "executive_summary": (
            f"{business_name} is a new business established by {owner_name} in {location}, Zambia. "
            f"The business addresses a clearly identified market opportunity in the local area. "
            f"\n\n"
            f"The business will serve the growing demand in {location} with a focus on quality, "
            f"reliability, and exceptional customer service. "
            f"\n\n"
            f"With an initial investment of {cap}, the business is projected to reach profitability "
            f"within the first three months of operation."
        ),
        "business_description": (
            f"{business_name} will operate in {location}, providing products and services to the local community. "
            f"The business will be registered with PACRA as a private limited company.\n\n"
            f"The mission is to deliver consistent value to customers while building a sustainable, "
            f"growing enterprise that contributes to the local economy."
        ),
        "market_analysis": (
            f"The Zambian SME sector contributes significantly to GDP and employment. "
            f"The {location} area represents a strong market opportunity.\n\n"
            f"Target customers are residents and businesses in the immediate area who require "
            f"the products and services offered.\n\n"
            f"The competitive landscape presents an opportunity for a well-run operation to capture "
            f"significant market share."
        ),
        "products_services": (
            f"The business will offer core products and services tailored to local demand. "
            f"Pricing will be competitive while maintaining healthy margins.\n\n"
            f"Quality and consistency will be the primary differentiators."
        ),
        "marketing_strategy": (
            f"Marketing will focus on WhatsApp Business, Facebook, and local word-of-mouth referrals. "
            f"Physical presence and signage in {location} will drive walk-in traffic.\n\n"
            f"Customer retention will be built through consistent service quality and loyalty incentives."
        ),
        "operations_plan": (
            f"Daily operations will be managed by {owner_name} with support staff as needed. "
            f"Key suppliers will be sourced from nearby wholesale markets.\n\n"
            f"The first 90 days will focus on setup, registration, and acquiring the first anchor clients."
        ),
        "financial_narrative": (
            f"The business requires an initial investment of {cap} to cover equipment, inventory, "
            f"premises, and working capital. Revenue is projected to grow steadily from Month 1.\n\n"
            f"The business is expected to reach break-even by Month 3 and generate consistent "
            f"monthly profit thereafter."
        ),
        "funding_requirements": (
            f"The business is seeking funding to supplement the owner's equity contribution. "
            f"Funds will be used for additional equipment and working capital.\n\n"
            f"Repayment will be structured against projected monthly cash flows. "
            f"CDF and CEEC financing options have been identified as suitable sources."
        ),
        "startup_costs": [
            {"item": "Equipment & Assets",         "amount": "K0,000"},
            {"item": "Initial Stock/Inventory",    "amount": "K0,000"},
            {"item": "Premises (deposit + 2 mo.)", "amount": "K0,000"},
            {"item": "Staff Wages (2 months)",     "amount": "K0,000"},
            {"item": "Marketing & Branding",       "amount": "K0,000"},
            {"item": "PACRA + ZRA Registration",   "amount": "K700"},
            {"item": "Operating Reserve",          "amount": "K0,000"},
        ],
        "monthly_projections": [
            {"month": "Month 1", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Setup & launch"},
            {"month": "Month 2", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "First clients"},
            {"month": "Month 3", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Break-even"},
            {"month": "Month 6", "revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Stable"},
            {"month": "Month 12","revenue": "K0,000", "expenses": "K0,000", "profit": "K0,000", "notes": "Growth"},
        ],
    }


# ── PDF Assembly ──────────────────────────────────────────────────────────────

async def generate_business_plan_pdf(
    plan_id: int,
    business_name: str,
    owner_name: str,
    location: str,
    capital: Optional[float],
    idea_summary: str,
    plan_json_text: str,
    survey_data: Optional[dict] = None,
    log_summary: Optional[dict] = None,
    projected_profit: Optional[float] = None,
) -> bytes:
    """
    Generate a complete, professional business plan PDF.
    Returns the PDF as bytes.
    """
    # Generate AI content
    content = await _generate_plan_content(
        business_name=business_name,
        owner_name=owner_name,
        location=location,
        capital=capital,
        idea_summary=idea_summary,
        survey_data=survey_data,
        log_summary=log_summary,
        projected_profit=projected_profit,
    )

    st = _styles()
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=0.9*inch,
        rightMargin=0.9*inch,
        topMargin=0.85*inch,
        bottomMargin=0.65*inch,
        title=f"Business Plan — {business_name}",
        author=owner_name,
    )
    doc._title = business_name

    story = []

    # ── COVER PAGE ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.2*inch))

    # Logo
    logo = _logo_data()
    if logo:
        from reportlab.lib.utils import ImageReader
        story.append(
            Table([[ImageReader(io.BytesIO(logo))]],
                  colWidths=[0.9*inch], rowHeights=[0.9*inch])
        )
        story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph('BUSINESS PLAN', ParagraphStyle('coverl',
        fontName='Helvetica-Bold', fontSize=11, textColor=TEAL,
        charSpace=5, spaceAfter=10)))
    story.append(Paragraph(business_name, st['cover_title']))
    story.append(Paragraph(f'{location}, Zambia', ParagraphStyle('cloc',
        fontName='Helvetica', fontSize=15, textColor=MUTED, spaceAfter=32)))

    story.append(Spacer(1, 0.4*inch))

    # Cover info table
    cover_info = [
        ['Prepared by', owner_name],
        ['Location',    location],
        ['Capital',     f"K{capital:,.0f}" if capital else "As recommended"],
        ['Date',        datetime.now().strftime('%B %Y')],
        ['Prepared with', 'KIP — Kwacha Intelligence Platform'],
    ]
    ci_data = []
    for row in cover_info:
        ci_data.append([
            Paragraph(row[0], ParagraphStyle('cl', fontName='Helvetica-Bold',
                       fontSize=9, textColor=TEAL, spaceAfter=0)),
            Paragraph(row[1], ParagraphStyle('cv', fontName='Helvetica',
                       fontSize=11, textColor=WHITE, spaceAfter=0)),
        ])
    ci_tbl = Table(ci_data, colWidths=[4.5*cm, 11*cm])
    ci_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor('#1B3A5C')),
    ]))
    story.append(ci_tbl)
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(
        'CONFIDENTIAL — This document is prepared for the purpose of presenting '
        'a business proposal and seeking financing. All information is based on '
        'market research and reasonable projections.',
        ParagraphStyle('disc', fontName='Helvetica-Oblique', fontSize=8,
                       textColor=MUTED, leading=12)
    ))
    story.append(PageBreak())

    # ── SECTION BUILDER ──────────────────────────────────────────────────────
    def body(text):
        if not text:
            return []
        parts = []
        for para in text.split('\n\n'):
            para = para.strip()
            if para:
                parts.append(Paragraph(para, st['body']))
                parts.append(Spacer(1, 4))
        return parts

    def bullet_list(items):
        return [Paragraph(item.strip(), st['bullet']) for item in items if item.strip()]

    # 1. Executive Summary
    story.extend(_section_header('1.  Executive Summary'))
    story.extend(body(content.get('executive_summary', '')))
    story.append(Spacer(1, 12))

    # Key metrics highlight box
    if capital or projected_profit:
        metrics = []
        if capital:
            metrics.append(['Startup Capital', f"K{capital:,.0f}"])
        if projected_profit:
            metrics.append(['Projected Monthly Profit', f"K{projected_profit:,.0f}"])
        metrics.append(['Location', location])
        metrics.append(['Business Owner', owner_name])
        story.append(_kpi_table(metrics))
    story.append(PageBreak())

    # 2. Business Description
    story.extend(_section_header('2.  Business Description', DARK))
    story.extend(body(content.get('business_description', '')))
    story.append(Spacer(1, 16))

    # 3. Market Analysis
    story.extend(_section_header('3.  Market Analysis', TEAL))
    story.extend(body(content.get('market_analysis', '')))

    if survey_data:
        story.append(Spacer(1, 10))
        story.append(Paragraph('Market Intelligence (Owner-Verified)', st['h3']))
        survey_rows = []
        field_labels = {
            'area_type': 'Area Type', 'foot_traffic': 'Foot Traffic',
            'dominant_income_level': 'Customer Income Level',
            'competition_quality': 'Competition Level',
            'market_gaps_noted': 'Identified Market Gaps',
            'payment_preference': 'Payment Preference',
        }
        for field, label in field_labels.items():
            val = survey_data.get(field)
            if val:
                survey_rows.append([label, str(val).replace('_', ' ').title()])
        if survey_rows:
            story.append(_kpi_table(survey_rows))
    story.append(PageBreak())

    # 4. Products & Services
    story.extend(_section_header('4.  Products and Services', GOLD))
    story.extend(body(content.get('products_services', '')))
    story.append(Spacer(1, 16))

    # 5. Marketing Strategy
    story.extend(_section_header('5.  Marketing Strategy', BLUE))
    story.extend(body(content.get('marketing_strategy', '')))
    story.append(PageBreak())

    # 6. Operations Plan
    story.extend(_section_header('6.  Operations Plan', DARK))
    story.extend(body(content.get('operations_plan', '')))
    story.append(Spacer(1, 16))

    # 7. Financial Plan
    story.extend(_section_header('7.  Financial Projections', GREEN))
    story.extend(body(content.get('financial_narrative', '')))
    story.append(Spacer(1, 12))

    # Startup costs table
    startup_costs = content.get('startup_costs', [])
    if startup_costs:
        story.append(Paragraph('Startup Capital Breakdown', st['h3']))
        story.append(Spacer(1, 6))
        costs_data = [['Item', 'Estimated Cost']]
        for row in startup_costs:
            costs_data.append([row.get('item', ''), row.get('amount', '')])
        story.append(_financial_table(['Item', 'Estimated Cost'], [
            [r.get('item', ''), r.get('amount', '')] for r in startup_costs
        ]))
        story.append(Spacer(1, 16))

    # Monthly projections table
    projections = content.get('monthly_projections', [])
    if projections:
        story.append(Paragraph('12-Month Revenue Projections', st['h3']))
        story.append(Spacer(1, 6))
        story.append(_financial_table(
            ['Period', 'Revenue', 'Expenses', 'Net Profit', 'Notes'],
            [[r.get('month',''), r.get('revenue',''), r.get('expenses',''),
              r.get('profit',''), r.get('notes','')] for r in projections]
        ))
    story.append(PageBreak())

    # 8. Funding Requirements
    story.extend(_section_header('8.  Funding Requirements', GOLD))
    story.extend(body(content.get('funding_requirements', '')))

    # Zambian funding sources
    story.append(Spacer(1, 12))
    story.append(Paragraph('Relevant Zambian Funding Sources', st['h3']))
    funding_sources = [
        ['CDF (Constituency Development Fund)', 'K5,000–K50,000. Apply through local MP\'s office. No collateral required for small amounts.'],
        ['CEEC (Citizens Economic Empowerment)', 'K5,000–K500,000. ceec.org.zm. Focused on citizen-owned SMEs.'],
        ['DBZ (Development Bank of Zambia)',     'K20,000+. SME lending at concessional rates. Requires business plan.'],
        ['FINCA / Bayport Microfinance',         'K500–K20,000. Quick access. Suitable for working capital top-up.'],
    ]
    story.append(_kpi_table(funding_sources, col_widths=[5.5*cm, 9.5*cm]))
    story.append(Spacer(1, 24))

    # Closing
    story.append(HRFlowable(width='100%', thickness=1, color=MGRAY))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        f'This business plan was prepared with the assistance of KIP — Kwacha Intelligence Platform. '
        f'All projections are estimates based on market research and are subject to actual market conditions. '
        f'The owner, {owner_name}, takes full responsibility for the accuracy of the information provided.',
        ParagraphStyle('closing', fontName='Helvetica-Oblique', fontSize=8.5,
                       textColor=DGRAY, leading=13, alignment=TA_CENTER)
    ))

    # Build
    doc.build(story, onFirstPage=_on_cover, onLaterPages=_on_page)
    buf.seek(0)
    return buf.read()
